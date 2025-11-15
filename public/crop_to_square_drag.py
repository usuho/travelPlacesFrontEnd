# -*- coding: utf-8 -*-
"""
功能：
- 将 PNG 图片裁剪为正方形（从上和下等比例裁剪）
- 支持直接把 PNG 文件拖到 exe 上执行（打包后可用）
"""

from PIL import Image
import os
import sys

def crop_to_square(input_path):
    try:
        img = Image.open(input_path)
    except Exception as e:
        print(f"无法打开图像文件: {input_path}\n错误: {e}")
        return

    width, height = img.size

    if width == height:
        print("图片已经是正方形，不需要裁剪：", input_path)
        return

    if height < width:
        print("高度比宽度小，无法上下裁剪出正方形：", input_path)
        return

    target = width
    crop_total = height - target

    crop_top = crop_total // 2
    crop_bottom = crop_total - crop_top

    # 裁剪区域 (left, top, right, bottom)
    box = (0, crop_top, width, height - crop_bottom)
    cropped = img.crop(box)

    # 输出文件名
    base, ext = os.path.splitext(input_path)
    output_path = f"{base}_square.png"

    cropped.save(output_path, "PNG")
    print(f"裁剪完成：{output_path}")


if __name__ == "__main__":
    # 检查是否有拖拽进来的文件
    if len(sys.argv) > 1:
        for file in sys.argv[1:]:
            crop_to_square(file)

        print("\n处理已完成！按回车退出…")
        input()
    else:
        print("请把 PNG 文件拖到这个程序上来裁剪为正方形。")
        input()
