<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld msg="Welcome to Your Vue.js App"/>
  </div>
</template>

<script>
import HelloWorld from './components/HelloWorld.vue'
// import axios from 'axios'
import jsonp from 'jsonp'
export default {
  name: 'App',
  components: {
    HelloWorld
  },
  data(){
    return{
      age:18,
      data:''
    }
  },
  // axios跨域
  // mounted(){
  //   let url = "https://www.easy-mock.com/mock/5b012c1fe6e1035843cd3aff/mockapi/table/list"
  //   // let url = "https://www.easy-mock.com"
  //   axios.get(url).then(()=>{

  //   });
  // }


  // jsonp跨域
  // mounted(){
  //   let url = "https://www.imooc.com/activity/servicetime"
  //   jsonp(url,(err,res)=>{
  //     let result = res;
  //     this.data = result;
  //   })
  // }
  
  // 代理跨域
  mounted(){
    // let url = "https://www.imooc.com/activity/servicetime"

    // vue.config.js已设置跨域前缀，已用localhist:8080代替https://www.imooc.com
    // 用地址后缀本身的activity时的地址
    // let url = "/activity/servicetime"

    // let url = "/activity/servicetime"
    // 增加一个虚拟的api前缀，与vue.config.js中的api对应
    let url = "/api/activity/servicetime"
    jsonp(url,(err,res)=>{
      let result = res;
      this.data = result;
    })
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
