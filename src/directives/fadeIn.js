export default {
  mounted(el) {
    el.style.opacity = 0;
    el.style.transition = 'opacity 1s ease-in-out';

    const fadeIn = () => {
      requestAnimationFrame(() => {
        el.style.opacity = 1;
      });
    };

    const handleLoad = () => {
      fadeIn();
      el.removeEventListener('load', handleLoad);
    };

    // ✅ 强制下一帧再检测图片加载状态
    requestAnimationFrame(() => {
      if (el.tagName === 'IMG') {
        if (el.complete && el.naturalHeight !== 0) {
          fadeIn();
        } else {
          el.addEventListener('load', handleLoad);
        }
      } else {
        fadeIn();
      }
    });
  }
};
