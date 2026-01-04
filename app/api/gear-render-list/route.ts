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
      
      // 过滤出 PNG 文件，并按文件名排序（保证幂等性）
      const pngFiles = files
        .filter(file => file.toLowerCase().endsWith('.png'))
        .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true })) // 使用localeCompare确保稳定的排序
        .slice(0, 3); // 只取前3个
      
      console.log('目录文件列表:', files);
      console.log('过滤后的PNG文件:', pngFiles);

      // 从文件名中提取角度信息（格式：id_h角度_p0.png）
      const fileList = pngFiles.map(file => {
        const match = file.match(/^(\d+)_h(\d+)_p0\.png$/);
        if (match) {
          return {
            fileName: file,
            angle: `h${match[2]}`,
          };
        }
        return {
          fileName: file,
          angle: 'h0', // 默认角度
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

