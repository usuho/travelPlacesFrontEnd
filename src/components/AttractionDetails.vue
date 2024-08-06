<template>
    <div class="container">
      <h1>{{ attraction.name }}</h1>
      <button @click="goBack" class="back-button">返回</button>
      <div v-if="attraction" class="attraction-details">
        <div class="images">
          <div>
            <img :src="`data:image/jpeg;base64,${attraction.image1}`" alt="Attraction Image" style="width: auto; height: auto;" />
          </div>

          <div>
            <img :src="`data:image/jpeg;base64,${attraction.image2}`" alt="Attraction Image" style="width: auto; height: auto;" />
            <img :src="`data:image/jpeg;base64,${attraction.image3}`" alt="Attraction Image" style="width: auto; height: auto;" />
          </div>
          
        </div>

        <div>
          <p style="color: #b30021;">地点：</p><p class="content">{{ attraction.region }}</p>
          <p style="color: #b30021;">所属县：</p><p class="content">{{ attraction.county }}</p>
          <p style="color: #b30021;">概况：</p><p class="content">{{ attraction.overview }}</p>
          <p style="color: #b30021;">用时参考：</p><p class="content">{{ attraction.duration }}</p>
          <p style="color: #b30021;">详情：</p><p class="content">{{ attraction.details }}</p>
          <p style="color: #b30021;">景点位置：</p><p class="content">{{ attraction.position }}</p>
          <p style="color: #b30021;">总评论数:</p><p class="content"> {{ attraction.total_reviews }}</p>
          <p style="color: #b30021;">好评率:</p><p class="content"> {{ attraction.rating }}</p>
          <p style="color: #b30021;">好评数:</p><p class="content"> {{ attraction.positive_reviews }}</p>
          <p style="color: #b30021;">网址：</p><a class="content" :href="attraction.website">{{ attraction.website }}</a>
        </div>  
      </div>
    </div>
    <div class="pagination">
          <button @click="prevPage":disabled="index === 0" class="pagination-button">上一页</button>
          <button @click="nextPage":disabled="index === 19" class="pagination-button">下一页</button>
      </div>
  </template>
  
  <script>
  import { openDB } from 'idb';

  export default {
    data() {
      return {
        country: this.$route.params.country,
        id: this.$route.params.id,
        attraction: null,
        image1: null,
        image2: null,
        image3: null,
        index:parseInt(localStorage.getItem('attractionIndex')) || 0,
        ids: localStorage.getItem('ids') ? localStorage.getItem('ids').split(',').map(Number) : [] || null
      };
    },
    async created() {
      this.db = await openDB('AttractionsDB', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('images')) {
            db.createObjectStore('images');
          }
        }
      });
      await this.fetchAttractionDetails();
    },
    methods: {

      async fetchAttractionDetails() {
        const response = await fetch(`https://travelplaces-80006ece4dd7.herokuapp.com/attraction/${this.country}/${this.id}`);
        const data = await response.json();
        this.attraction = data;

        // 缓存图像
        this.image1 = await this.loadOrCacheImage(`${this.country}-${this.id}-image1`, data.image1);
        this.image2 = await this.loadOrCacheImage(`${this.country}-${this.id}-image2`, data.image2);
        this.image3 = await this.loadOrCacheImage(`${this.country}-${this.id}-image3`, data.image3);
      },

      async loadOrCacheImage(key, imageData) {
        const cachedImage = await this.db.get('images', key);
        if (cachedImage) {
          return `data:image/jpeg;base64,${cachedImage}`;
        } else {
          await this.db.put('images', imageData, key);
          return `data:image/jpeg;base64,${imageData}`;
        }
      },

      nextPage() {
        if (this.index < 19) {
          fetch(`https://travelplaces-80006ece4dd7.herokuapp.com/attraction/${this.country}/${this.ids[this.index+1]}`)
          .then(response => response.json())
          .then(data => {
            this.attraction = data;
          });
          this.$router.push(`${this.ids[this.index+1]}`);
          this.index ++
        }
      },

      prevPage() {
        if (this.index > 0) {
          
          fetch(`https://travelplaces-80006ece4dd7.herokuapp.com/attraction/${this.country}/${this.ids[this.index-1]}`)
          .then(response => response.json())
          .then(data => {
            this.attraction = data;
          });
          this.$router.push(`${this.ids[this.index-1]}`);
          this.index--
        }
      },

      goBack() {
        const page = localStorage.getItem('attractionsPage') || 1; // 重点：从localStorage获取当前页数
        this.$router.push(`/attractions/${this.country}?page=${page}`);
      }
    }
  };
  </script>


  <style scoped>
  .content{
    margin-bottom: 20px; /* Adjust this value to increase spacing */
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(207, 206, 206, 0.1);
    padding: 10px;
    list-style: none;
    width:auto;
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    background-color: #f9f9f9;
  }
  
  h1 {
    font-size: 2em;
    margin-bottom: 20px;
    color: #333;
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
  
  .attraction-details {
    font-size: 1.2em;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 800px;
  }
  
  
  .images {
    display:contents;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .images img {
    width: auto;
    height: auto;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    margin: 5px;
  }
  
  .info {
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    width: 100%;
  }
  
  .info p {
    margin: 10px 0;
    color: #555;
  }
  
  .info p strong {
    color: #333;
  }
  
  .website-link {
    display: inline-block;
    margin-top: 10px;
    color: #007BFF;
    text-decoration: none;
  }
  
  .website-link:hover {
    text-decoration: underline;
  }

  .pagination-button {
    align-self: flex-start;
    margin: 20px;
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


  </style>