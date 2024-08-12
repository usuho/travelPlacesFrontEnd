<template>
    <div class="container">
      <h1>{{translateCountry(country)}}的景点</h1>

      <div class="pagination">
        <button @click="goBack" class="back-button">返回</button>
        <button @click="prevPage" :disabled="page === 1" class="pagination-button-t">上一页</button>
          <span>第 {{ page }} 页，总共 {{ totalPages }}页 </span>
        <button @click="nextPage" :disabled="page === totalPages" class="pagination-button-t">下一页</button>
        <label for="gotoPage">跳转：</label>
        <input type="number" v-model.number="gotoPage" @change="validateInput" id="gotoPage" :max="totalPages" :min="1" class="goto-input" />
      </div>
      
      <!-- 新增的过滤和排序功能 -->
      <div class="filters">
        <div>
          <label for="minReviews">评论数大于:</label>
          <input type="number" v-model="minReviews" @change="validateInputmin" min="0" class="filter-input" />
          <label for="order">排序:</label>
          <select v-model="order" class="filter-select">
            <option value="rating_asc">好评率升序</option>
            <option value="rating_desc">好评率降序</option>
            <option value="reviews_asc">总评论数升序</option>
            <option value="reviews_desc">总评论数降序</option>
            <option value="positive_asc">好评数升序</option>
            <option value="positive_desc">好评数降序</option>
          </select>
          <label for="region">地点:</label>
          <select v-model="selectedRegion" id="region" class="filter-select">
            <option value="">所有地点</option>
            <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
          </select>
          <label for="region">所属县:</label>
          <select v-model="selectedCounty" id="county" class="filter-select">
            <option value="">所有县</option>
            <option v-for="county in countis" :key="county" :value="county">{{ county }}</option>
          </select>
        </div>
        
      </div>


      <!-- 表格展示景点信息 -->
      <table class="attraction-table">
        <thead>
          <tr>
            <th>图片</th> <!-- 新增的图片列 -->
            <th>景点名称</th>
            <th>地点</th>
            <th>所属县</th>
            <th>总评论数</th>
            <th>好评率</th>
            <th>好评数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for= "(attraction,index) in attractions" :key="attraction.id">
            <th>
              <img :src= "`data:image/jpeg;base64,${attraction.image1}`" alt="Attraction Image" class="attraction-image" />
            </th>
            <td><router-link :to="`/attraction/${country}/${attraction.id}`" @click.native="handleClick(attraction,index,$event)">{{ attraction.name }}</router-link></td>
            <td>{{ attraction.region }}</td>
            <td>{{ attraction.county }}</td>
            <td>{{ attraction.total_reviews }}</td>
            <td>{{ attraction.rating }}</td>
            <td>{{ attraction.positive_reviews }}</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button @click="goBack" class="back-button">返回</button>
        <button @click="prevPage" :disabled="page === 1" class="pagination-button">上一页</button>
        <span>第 {{ page }} 页，总共 {{ totalPages }}页 </span>
        <button @click="nextPage" :disabled="page === totalPages" class="pagination-button">下一页</button>
        <label for="gotoPage">跳转:</label>
        <input type="number" v-model.number="gotoPage" id="gotoPage" :max="totalPages" :min="1" class="goto-input" />
      </div>
    </div>
  </template>
  
  <script>
  import { openDB } from 'idb';

  export default {
    data() {
      return {
        country: this.$route.params.country,
        attractions: [],
        minReviews: parseInt(localStorage.getItem('attractionMinReviews')) || null, 
        order: localStorage.getItem('attractionsOrder') ||'rating_desc', 
        page: parseInt(localStorage.getItem('attractionsPage')) || 1,
        limit: 20,
        total: 0,
        gotoPage: null,
        countryTranslations: {
          japan: '日本',
          // 可以添加更多国家的翻译
        },
        selectedRegion: localStorage.getItem('attractionsRegion')||'',
        selectedCounty: localStorage.getItem('attractionsCounty')||'',
        regions: [],
        countis: []
      };
    },
    computed: {
      totalPages() {
        return Math.ceil(this.total / this.limit);
      }
    },
    async created() {
      this.db = await openDB('AttractionsDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('images')) {
            db.createObjectStore('images');
          }
        }
      });
      this.fetchAttractions(false);
      this.fetchRegions();
      this.fetchCountis();
    },

    watch: {
      minReviews() {
        if (Number.isInteger(value) && value > -1 ) {
          this.page = 1;
          localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
          localStorage.setItem('attractionMinReviews',this.minReviews);
          this.fetchAttractions(false); // **新增的watch**
        }else {
          this.minReviews = null;
        }
      },

      order() {
        localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
        localStorage.setItem('attractionsOrder',this.order);
        this.fetchAttractions(false);}, // **新增的watch**

      gotoPage(value) {
          if (Number.isInteger(value) && value > 0 && value <= this.totalPages) {
              this.page = value;
              localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
          } else {
              this.gotoPage = null;
          }
      },

      selectedRegion() {
        this.page = 1;
        localStorage.setItem('attractionsPage', this.page); 
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        this.fetchAttractions(true);},

      selectedCounty() {
        this.fetchRegions();
        this.page = 1;
        localStorage.setItem('attractionsPage', this.page); 
        localStorage.setItem('attractionsCounty',this.selectedCounty)
        this.fetchAttractions(true);},


    },

    methods: {
      handleClick(attraction,index,event) {
        event.preventDefault();
        const ids=[];
        localStorage.setItem('attractionIndex',index);
        for (let i = 0; i<this.attractions.length;i++) {
          ids.push(this.attractions[i].id)
        };
        console.log(ids);
        localStorage.setItem('ids',ids);
        this.$router.push(`/attraction/${this.country}/${attraction.id}`)
      },

      translateCountry(country) {
        return this.countryTranslations[country] || country;
      },
      
      fetchRegions() {
        if (this.selectedCounty) {
          fetch(`https://travelplaces-80006ece4dd7.herokuapp.com/regions/${this.country}/${this.selectedCounty}`)
          .then(response => response.json())
          .then(data => {
            this.regions = data;
          })
          .catch(error => {
            console.error('Error fetching regions:', error);
          });
        }else {
          fetch(`https://travelplaces-80006ece4dd7.herokuapp.com/regions/${this.country}`)
          .then(response => response.json())
          .then(data => {
            this.regions = data;
          })
          .catch(error => {
            console.error('Error fetching regions:', error);
          });
        }
        
      },

      fetchCountis() {
        fetch(`https://travelplaces-80006ece4dd7.herokuapp.com/countis/${this.country}`)
          .then(response => response.json())
          .then(data => {
            this.countis = data;
          })
          .catch(error => {
            console.error('Error fetching regions:', error);
          });
      },

      async fetchAttractions(isregion) {
        const params = new URLSearchParams();
        params.append('minReviews', this.minReviews); // 传递过滤条件
        params.append('order', this.order); // 传递排序条件
        if (isregion){
          params.append('page',1);
        }
        else {
          params.append('page',this.page);
        }
        params.append('limit',this.limit);

        if (this.selectedRegion) {
          params.append('region', this.selectedRegion);
        }

        if (this.selectedCounty) {
          params.append('county', this.selectedCounty);
        }

        const response = await fetch(`https://travelplaces-80006ece4dd7.herokuapp.com/attractions/${this.country}?${params.toString()}`);
        const data = await response.json();
      
        if (data.data.length > 0) {
          this.total = data.total;
          this.attractions = await Promise.all(data.data.map(async attraction => {
            attraction.image1 = await this.loadOrCacheImage(`${this.country}-${attraction.id}-image1`, attraction.image1);
            return attraction;
          }));
        } else {
          alert('未找到景点！');
        }
      },

      async loadOrCacheImage(key, imageData) {
      const cachedImage = await this.db.get('images', key);
      if (cachedImage) {
        return cachedImage;
      } else {
        await this.db.put('images', imageData, key);
        return imageData;
      }
    },

      goBack() {
        localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
        localStorage.setItem('attractionMinReviews',this.minReviews);
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        localStorage.setItem('attractionsOrder',this.order)
        this.$router.push('/');
      },

      nextPage() {
      if (this.page < this.totalPages) {
        this.page++;
        localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
        localStorage.setItem('attractionMinReviews',this.minReviews);
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        localStorage.setItem('attractionsOrder',this.order)
        this.fetchAttractions(false);
      }
    },

      prevPage() {
        if (this.page > 1) {
          this.page--;
          localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
          localStorage.setItem('attractionMinReviews',this.minReviews);
          localStorage.setItem('attractionsRegion', this.selectedRegion);
          localStorage.setItem('attractionsOrder',this.order)
          this.fetchAttractions(false);
        }
      },

      validateInput() {
            if (!Number.isInteger(this.gotoPage) || this.gotoPage < 1) {
                this.gotoPage = 1;
            } else if (this.gotoPage > this.totalPages) {
                this.gotoPage = null;
            }
        },

      validateInputmin() {
          if (!Number.isInteger(this.minReviews) || this.minReviews < 0) {
              this.minReviews = null;
          } 
      }
    }
  };
  </script>


  <style scoped>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px; 
    box-sizing: border-box;
    height: 100vh;
    width: 100%;
    background-color: #f0f0f0; /* 设置背景色为浅色 */
    color: #333; /* 设置文字颜色 */
    font-family: 'Arial', sans-serif; /* 设置字体 */
  }
  
  h1 {
    font-size: 2.5em;
    margin-bottom: 20px;
  }
  
  .filters {
    margin-bottom: 20px;
  }
  
  .filters label {
    margin-right: 10px;
  }
  
  .filters input{
    margin-right: 20px;
    width:50px;
    background-color: #fff;
    color: #333;
    border: 1px solid #ccc;
    padding: 5px;
    border-radius: 5px;
  }
  .filters select {
    margin-right: 20px;
    width:100px;
    background-color: #fff;
    color: #333;
    border: 1px solid #ccc;
    padding: 5px;
    border-radius: 5px;
  }
  
  .attraction-table {
    width:fit-content;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  
  .attraction-table th {
    font-size: 1.2em;
    border: 1px solid #ddd;
    background-color: #fff;
    white-space: nowrap; /* 使表格宽度自适应内容 */
  }
  .attraction-table td {
    font-size: 1.2em;
    padding: 10px;
    border: 1px solid #ddd;
    background-color: #fff;
    white-space: nowrap; /* 使表格宽度自适应内容 */
  }
  
  .attraction-image {
    padding: 0px;
    width: 200px;
    height: auto;
  }
  
  .pagination {
    margin-bottom: 20px;
  }
  
  .pagination-button {
    align-self: flex-start;
    margin-right: 15px;
    margin-bottom: 100px;
    padding: 10px 20px;
    background-color: #007BFF;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s;
  }

  .pagination-button-t {
    align-self: flex-start;
    margin-right: 15px;
    margin-top: 50px;
    padding: 10px 20px;
    background-color: #007BFF;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s;
  }

  .pagination-button:hover{
    background-color: #b30021;
  }
  
  .pagination-button:disabled {
    background-color: #bbb;
  }
  
  .pagination-button-t:hover{
    background-color: #b30021;
  }
  
  .pagination-button-t:disabled {
    background-color: #bbb;
  }
  
  .goto-page {
    margin-bottom: 20px;
  }
  
  .goto-page label {
    margin-right: 10px;
  }
  
  .goto-input {
    background-color: #fff;
    color: #333;
    border: 1px solid #ccc;
    padding: 5px;
    border-radius: 5px;
    width: 50px;
  }
  
  .back-button {
    align-self: flex-start;
    margin-right: 15px;
    padding: 10px 20px;
    background-color: #007BFF;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s;
  }
  
  .back-button:hover {
    background-color: #b30021;
  }
  </style>