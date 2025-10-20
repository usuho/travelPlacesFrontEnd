// src/directives/flyIn.js
export default {
  mounted(el) {
    const items = Array.from(el.children);
    items.forEach((item, index) => {
      // 初始状态
      item.style.opacity = 0;
      item.style.transform = "translateY(50px)";
      item.style.animation = `flyInUp 0.25s ease-out forwards`;
      item.style.animationDelay = `${index * 0.03}s`; // 每个卡片相差 0.03s
    });
  },
};
