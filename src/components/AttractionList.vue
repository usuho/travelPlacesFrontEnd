<template>
    <div class="container">
      <h1>{{translateCountry(country)}}的景点</h1>

      <div class="pagination">
          <button @click="prevPage" :disabled="page === 1" class="pagination-button">上一页</button>
            <span>第 {{ page }} 页，总共 {{ totalPages }}页</span>
          <button @click="nextPage" :disabled="page === totalPages" class="pagination-button">下一页</button>
          <label for="gotoPage">跳转:</label>
          <input type="number" v-model.number="gotoPage" id="gotoPage" :max="totalPages" :min="1" class="goto-input" />
      </div>
      
      <!-- 新增的过滤和排序功能 -->
      <div class="filters">
        <div>
          <button @click="goBack" class="back-button">返回</button>
          <label for="minReviews">评论数大于:</label>
          <input type="number" v-model="minReviews" min="0" class="filter-input" />
          <label for="order">排序:</label>
          <select v-model="order" class="filter-select">
            <option value="rating_asc">好评率升序</option>
            <option value="rating_desc">好评率降序</option>
            <option value="reviews_asc">总评论数升序</option>
            <option value="reviews_desc">总评论数降序</option>
          </select>
          <label for="region">地点:</label>
          <select v-model="selectedRegion" id="region" class="filter-select">
            <option value="">所有地点</option>
            <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
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
            <th>总评论数</th>
            <th>好评率</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for= "(attraction,index) in attractions" :key="attraction.id">
            <th>
              <img :src= "`data:image/jpeg;base64,${attraction.image1}`" alt="Attraction Image" class="attraction-image" />
            </th>
            <td><router-link :to="`/attraction/${country}/${attraction.id}`" @click.native="handleClick(attraction,index,$event)">{{ attraction.name }}</router-link></td>
            <td>{{ attraction.region }}</td>
            <td>{{ attraction.total_reviews }}</td>
            <td>{{ attraction.rating }}</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button @click="prevPage" :disabled="page === 1" class="pagination-button">上一页</button>
        <span>第 {{ page }} 页，总共 {{ totalPages }}页</span>
        <button @click="nextPage" :disabled="page === totalPages" class="pagination-button">下一页</button>
        <label for="gotoPage">跳转:</label>
        <input type="number" v-model.number="gotoPage" id="gotoPage" :max="totalPages" :min="1" class="goto-input" />
      </div>
    </div>
  </template>
  
  <script>

  export default {
    data() {
      return {
        country: this.$route.params.country,
        attractions: [],
        minReviews: parseInt(localStorage.getItem('attractionMinReviews')) || 0, 
        order: localStorage.getItem('attractionsOrder') ||'rating_desc', 
        page: parseInt(localStorage.getItem('attractionsPage')) || 1,
        limit: 20,
        total: 0,
        gotoPage: 1,
        countryTranslations: {
          japan: '日本',
          // 可以添加更多国家的翻译
        },
        selectedRegion: localStorage.getItem('attractionsRegion')||'',
        regions: []
      };
    },
    computed: {
      totalPages() {
        return Math.ceil(this.total / this.limit);
      }
    },
    created() {
      this.fetchAttractions(false);
      this.fetchRegions();
    },

    watch: {
      minReviews() {
        localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
        localStorage.setItem('attractionMinReviews',this.minReviews);
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        localStorage.setItem('attractionsOrder',this.order);
        this.fetchAttractions(false); }, // **新增的watch**

      order() {
        localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
        localStorage.setItem('attractionMinReviews',this.minReviews);
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        localStorage.setItem('attractionsOrder',this.order);
        this.fetchAttractions(false);}, // **新增的watch**

      gotoPage: 'jumpToPage',

      selectedRegion() {
        this.page = 1;
        localStorage.setItem('attractionsPage', 1); 
        localStorage.setItem('attractionMinReviews',this.minReviews);
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        localStorage.setItem('attractionsOrder',this.order)
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
        fetch(`http://localhost:3000/regions/${this.country}`)
          .then(response => response.json())
          .then(data => {
            this.regions = data;
          })
          .catch(error => {
            console.error('Error fetching regions:', error);
          });
      },

      fetchAttractions(isregion) {
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

        fetch(`http://localhost:3000/attractions/${this.country}?${params.toString()}`)
          .then(response => response.json())
          .then(data => {
            if (data.data.length > 0) {
              this.attractions = data.data;
              this.total = data.total;
            } else {
              alert('未找到景点！');
            }
          })
          .catch(error => {
            console.error('Error fetching data:', error);
          });
      },

      goBack() {
        localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
        localStorage.setItem('attractionMinReviews',this.minReviews);
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        localStorage.setItem('attractionsOrder',this.order)
        this.$router.push('/countries');
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

      jumpToPage() {
      if (this.gotoPage >= 1 && this.gotoPage <= this.totalPages) {
        this.page = this.gotoPage;
        localStorage.setItem('attractionsPage', this.page); // 保存当前页数到localStorage
        localStorage.setItem('attractionMinReviews',this.minReviews);
        localStorage.setItem('attractionsRegion', this.selectedRegion);
        localStorage.setItem('attractionsOrder',this.order)
        this.fetchAttractions(false);
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
    margin-bottom: 5px;
    width: 70%
    
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
    width:15%;
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
    margin-bottom: 20px;
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
    margin-bottom: 20px;
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