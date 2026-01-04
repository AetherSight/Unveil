import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const RENDER_BASE_DIR = process.env.RENDER_BASE_DIR || 'S:\\FFXIV_train_dataset';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gearId = searchParams.get('id');
    const gearName = searchParams.get('name');
    const angle = searchParams.get('angle') || 'h0'; // 默认角度 h0，支持 h0, h45, h225

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

    // 验证角度格式，只允许 h0, h45, h225
    if (!/^h(0|45|225)$/.test(angle)) {
      return NextResponse.json(
        { message: '无效的角度格式，只支持 h0, h45, h225' },
        { status: 400 }
      );
    }

    // 构建文件路径
    // 格式：名称_id\id_h0_p0.png 或 id_h45_p0.png 或 id_h225_p0.png
    const folderName = `${gearName}_${gearId}`;
    const fileName = `${gearId}_${angle}_p0.png`;
    
    // 规范化路径，防止路径遍历
    const folderPath = join(RENDER_BASE_DIR, folderName);
    const filePath = join(folderPath, fileName);

    // 输出文件路径用于调试
    console.log('渲染图文件路径:', filePath);
    console.log('目录路径:', folderPath);
    console.log('文件名:', fileName);
    console.log('gearName:', gearName);
    console.log('gearId:', gearId);
    console.log('angle:', angle);

    // 验证路径是否在允许的目录内（防止路径遍历攻击）
    const normalizedBaseDir = join(RENDER_BASE_DIR).toLowerCase();
    const normalizedFilePath = join(filePath).toLowerCase();
    
    if (!normalizedFilePath.startsWith(normalizedBaseDir)) {
      return NextResponse.json(
        { message: '无效的文件路径' },
        { status: 403 }
      );
    }

    try {
      // 读取文件
      const fileBuffer = await readFile(filePath);
      
      // 返回图片
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (fileError) {
      // 文件不存在
      return NextResponse.json(
        { message: '渲染图不存在' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Gear render API error:', error);
    return NextResponse.json(
      { message: '服务器错误' },
      { status: 500 }
    );
  }
}

