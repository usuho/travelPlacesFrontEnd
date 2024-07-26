<template>
  <div class="container">
    <h1>国家</h1>
    <ul class="country-list">
      <li v-for="country in countries" :key="country" class="country-item">
        <router-link :to="`/attractions/${country}`" class="country-link">{{ translateCountry(country) }}</router-link>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      countries: ['japan'], // 可以添加更多国家
      countryTranslations: {
        japan: '日本',
        // 可以添加更多国家的翻译
      }
    };
  },
  methods: {
    translateCountry(country) {
      return this.countryTranslations[country] || country;
    }
  }
};
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-left: 38.2%; /* 将内容对齐黄金分割线 */
  padding-top: 20%;
  box-sizing: border-box;
  height: 100vh;
  width: 100%;
  background-color: #ffffff; /* 设置背景色为黑色 */
  color: #000000; /* 设置文字颜色为浅色 */
}

h1 {
  font-size: 2.5em;
  margin-bottom: 20px;
  color: #000000; /* 设置标题颜色为浅色 */
}

.content {
  width: 100%;
}

.country-list {
  list-style: none;
  padding: 0;
  width: 100%;
}

.country-item {
  margin: 10px 0;
}

.country-link {
  text-decoration: none;
  font-size: 1.5em;
  color: #007bff;
  transition: color 0.3s;
}

.country-link:hover {
  color: #0056b3;
}
</style>