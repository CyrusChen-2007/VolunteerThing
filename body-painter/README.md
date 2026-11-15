# 现成人体 + 网页三维涂色

## 使用

把整个 skin-paint-ready 文件夹放到现有网页项目的静态目录（例如 public/skin-paint-ready）。访问 /skin-paint-ready/index.html 即可使用。

也可以嵌入：

    <iframe src="/skin-paint-ready/index.html"
      title="三维身体涂色"
      style="width:100%;height:1150px;border:0"></iframe>

独立预览需要本地 HTTP 服务（ES modules / GLB 加载不能直接双击 HTML）：

    cd skin-paint-ready
    python3 -m http.server 8080

打开 http://localhost:8080。所有库和模型均在包内，无需 API key、后端或外网。运行不需要 Blender。

## 交互

- 左键/单指拖动，在三维皮肤表面涂色。
- 右键拖动旋转，或使用“自由旋转”模式；支持任意方向翻转，围绕人体中心旋转。正/背/侧/俯视/仰视按钮可快速归位。滚轮缩放。
- 笔刷圆环跟随三维表面；笔迹存入 2048×2048 皮肤纹理，跨 UV 三角形绘制，随模型旋转与骨骼动作保持附着。
- 画笔大小、3 种颜色、橡皮擦、最近 5 步撤销、清空。
- 左右臂滑杆使用原模型骨骼权重；0° 表示原始 A 形绑定姿势，不是手臂垂直下垂或临床测量角度。
- 当前页面内保存标记；刷新清空。未自动上传到任何服务器。

## 接入保存

模型加载完成后，组件元素暴露 skinPaint 接口：

    const component = document.getElementById('skin-paint').skinPaint;
    const data = component.getState();
    // data 包含 version:2、left/right、PNG 纹理 data URL、strokeCount
    await component.setState(data);

iframe 同源时可通过 iframe.contentDocument 查找该元素。Version 2 标记仅适用于这一模型的 UV；与上一版顶点颜色存档不兼容。

主要文件：
- index.html：界面、import map
- app.js：模型加载、骨骼抬臂、三维刷子到 UV 纹理的投影与交互
- human.glb：现成的带蒙皮骨骼与 UV 人体
- three.module.js / GLTFLoader.js / BufferGeometryUtils.js：本地 Three.js r160 依赖

## 来源和边界

模型：Innerscene “Human base mesh with editable 53-bone rig”，基于 MakeHuman / MPFB，来源页标明 CC0。
https://www.innerscene.com/tools/library/3d-parts/human-base-mesh-with-editable-53-bone-rig-8e7c8ab1

许可：https://creativecommons.org/publicdomain/zero/1.0/
Three.js：MIT，见 THREE-LICENSE.txt。

本版保留源 GLB，替换显示材质并叠加可编辑的皮肤纹理；53 根源骨骼中当前只提供双侧上臂控制。是身体位置沟通原型，未经医学测量验证，不提供诊断或防碰撞仿真。手指缝等狭小区域和极端姿势仍可能需要进一步交互优化。

## 画笔性能更新

- 用可随姿势更新的 BVH 与缓存蒙皮位置进行命中检测。
- 使用空间网格只处理笔刷附近的 UV 三角形。
- 鼠标移动按显示帧合并，抬笔时补齐最后一段；同帧仅渲染一次。
- 保留原模型与 2048×2048 涂色纹理，关闭每次绘制时不必要的 mipmap 生成。
