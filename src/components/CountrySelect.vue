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
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10%;
  box-sizing: border-box;
  height: 100vh;
  width: 100%;
  background-color: #f0f0f0;
  color: #333333;
  font-family: 'Roboto', sans-serif;
  text-align: center;
}

h1 {
  font-size: 3em;
  margin-bottom: 20px;
  color: #333333;
}

.country-list {
  list-style: none;
  padding: 0;
  width: 60%;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.country-item {
  margin: 10px 0;
  padding: 10px;
  border-bottom: 1px solid #ddd;
}

.country-item:last-child {
  border-bottom: none;
}

.country-link {
  text-decoration: none;
  font-size: 1.8em;
  color: #3ea4cd;
  transition: color 0.3s;
}

.country-link:hover {
  color: #0056b3;
}
</style>