import Vue from 'vue'
import routers from './router'
import App from './App.vue'

Vue.config.productionTip = false

new Vue({
  router:routers,
  render: h => h(App),
}).$mount('#app')
