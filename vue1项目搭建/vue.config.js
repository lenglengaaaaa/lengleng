module.exports = {
    devServer:{
        host:'localhost',
        port:8080,
        proxy:{
            // https://www.imooc.com/activity/servicetime

            // '/activity'如果地址后面不一致则要写一堆拦截
            // '/activity':{
            //     target:'https://www.imooc.com',
            //     changeOrigin:true, //适配更改头
            //     pathRewrite:{
            //         '/activity':'/activity'
            //     }
            // }
            '/api':{
                target:'https://www.imooc.com',
                changeOrigin:true, //适配更改头
                pathRewrite:{
                    '/api':''
                }
            }
        }
    }
}

// 改了配置信息需要重新启动项目
