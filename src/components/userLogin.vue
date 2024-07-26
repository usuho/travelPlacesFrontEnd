<template>
    <div class="login-container">
      <h2>Login</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="username">Username:</label>
          <input type="text" id="username" v-model="username" required />
        </div>
        <div class="form-group">
          <label for="password">Password:</label>
          <input type="password" id="password" v-model="password" required />
        </div>
        <button type="submit">Login</button>
      </form>
      <p class="register-link">
        Don't have an account? <router-link to="/userRegister">Register here</router-link>
      </p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        username: '',
        password: '',
        errorMessage: ''
      };
    },
    methods: {
      async handleSubmit() {
        this.errorMessage = '';
        try {
          const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: this.username,
              password: this.password
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            this.errorMessage = errorData.msg;
          } else {
            const successData = await response.json();
            console.log(successData.msg);
            // 成功登录后导航到国家选择页面
            this.$router.push('/countries');
          }
        } catch (error) {
          this.errorMessage = 'An error occurred. Please try again later.';
        }
      }
    }
  };
  </script>
  
  <style scoped>
  .login-container {
    max-width: 300px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .form-group {
    margin-bottom: 15px;
  }
  .form-group label {
    display: block;
    margin-bottom: 5px;
  }
  .form-group input {
    width: 100%;
    padding: 8px;
    box-sizing: border-box;
  }
  button {
    width: 100%;
    padding: 10px;
    background-color: #007bff;
    border: none;
    color: white;
    cursor: pointer;
  }
  button:hover {
    background-color: #0056b3;
  }
  .register-link {
    margin-top: 10px;
    text-align: center;
  }
  .register-link a {
    color: #007bff;
    text-decoration: none;
  }
  .register-link a:hover {
    text-decoration: underline;
  }
  .error-message {
    color: red;
    margin-top: 10px;
    text-align: center;
  }
  </style>
  