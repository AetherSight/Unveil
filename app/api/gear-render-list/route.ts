import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

const RENDER_BASE_DIR = process.env.RENDER_BASE_DIR || 'S:\\FFXIV_train_dataset';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gearId = searchParams.get('id');
    const gearName = searchParams.get('name');

    // 验证参数
    if (!gearId || !gearName) {
      return NextResponse.json(
        { message: '缺少必要参数：id 和 name' },
        { status: 400 }
      );
    }

    // 验证 ID 格式（只允许数字）
    if (!/^\d+$/.test(gearId)) {
      return NextResponse.json(
        { message: '无效的装备ID格式' },
        { status: 400 }
      );
    }

    // 验证名称格式，防止路径遍历攻击
    // 只允许中文、英文、数字、下划线、连字符
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/.test(gearName)) {
      return NextResponse.json(
        { message: '无效的装备名称格式' },
        { status: 400 }
      );
    }

    // 构建文件夹路径
    // 格式：名称_id
    const folderName = `${gearName}_${gearId}`;
    const folderPath = join(RENDER_BASE_DIR, folderName);

    // 验证路径是否在允许的目录内（防止路径遍历攻击）
    const normalizedBaseDir = join(RENDER_BASE_DIR).toLowerCase();
    const normalizedFolderPath = join(folderPath).toLowerCase();
    
    if (!normalizedFolderPath.startsWith(normalizedBaseDir)) {
      return NextResponse.json(
        { message: '无效的文件路径' },
        { status: 403 }
      );
    }

    try {
      // 读取目录中的文件
      const files = await readdir(folderPath);
      
      // 过滤出 PNG 文件
      const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

      // 优先匹配特定模式：*_h0_p0.png, *_h45_p0.png, *_h225_p0.png, *_h255_p0.png
      const preferredPatterns = [
        /_h0_p0\.png$/i,
        /_h45_p0\.png$/i,
        /_h225_p0\.png$/i,
        /_h255_p0\.png$/i,
      ];
      
      // 按优先级匹配文件
      const matchedFiles: string[] = [];
      const otherFiles: string[] = [];
      
      for (const file of pngFiles) {
        const isPreferred = preferredPatterns.some(pattern => pattern.test(file));
        if (isPreferred) {
          matchedFiles.push(file);
        } else {
          otherFiles.push(file);
        }
      }
      
      // 对匹配的文件按模式顺序排序（h0, h45, h225, h255）
      matchedFiles.sort((a, b) => {
        const getPriority = (filename: string) => {
          if (/_h0_p0\.png$/i.test(filename)) return 0;
          if (/_h45_p0\.png$/i.test(filename)) return 1;
          if (/_h225_p0\.png$/i.test(filename)) return 2;
          if (/_h255_p0\.png$/i.test(filename)) return 3;
          return 999;
        };
        return getPriority(a) - getPriority(b);
      });
      
      // 其他文件按文件名排序
      otherFiles.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
      
      // 合并：优先文件在前，其他文件在后，总共取前3个
      const selectedFiles = [...matchedFiles, ...otherFiles].slice(0, 3);

      // 从文件名中提取信息
      // 直接使用完整文件名（去掉.png后缀）作为angle，这样可以直接用于构建文件路径
      const fileList = selectedFiles.map(file => {
        // 去掉.png后缀，作为angle参数传递给gear-render接口
        const angleKey = file.replace(/\.png$/, '');
        return {
          fileName: file,
          angle: angleKey, // 使用完整文件名（去掉.png）作为angle
        };
      });

      return NextResponse.json({ files: fileList });
    } catch (dirError) {
      // 目录不存在或无法读取
      console.error('读取目录失败:', folderPath, dirError);
      return NextResponse.json(
        { message: '目录不存在或无法读取', files: [] },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Gear render list API error:', error);
    return NextResponse.json(
      { message: '服务器错误', files: [] },
      { status: 500 }
    );
  }
}

