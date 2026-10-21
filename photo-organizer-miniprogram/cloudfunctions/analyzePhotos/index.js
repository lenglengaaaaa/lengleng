const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async function (event) {
  const photos = Array.isArray(event.photos) ? event.photos : []
  return {
    ok: true,
    status: 'local-only',
    message: '云函数入口已准备。当前版本只返回本地分析结果，接入腾讯云 AI 前请在此处配置服务端密钥。',
    count: photos.length,
    results: photos.map(function (photo) {
      return { id: photo.id, tags: [], summary: '', recommendation: 'pending' }
    })
  }
}
