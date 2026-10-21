const store = require('../../utils/photo-store')
Page({
  data: { stats: {}, recent: [], ready: false, importing: false },
  onShow() { this.refresh() },
  refresh() { const photos = store.loadPhotos(); this.setData({ stats: store.computeStats(photos), recent: photos.slice(0, 6).map(store.enrichPhoto), ready: true }) },
  choosePhotos() {
    const that = this
    wx.chooseImage({ count: 9, sizeType: ['original'], sourceType: ['album'], success(res) { that.importPhotos(res.tempFiles || []) }, fail() {} })
  },
  importPhotos(files) {
    if (!files.length) return
    this.setData({ importing: true })
    const that = this
    const fs = wx.getFileSystemManager()
    const items = files.map(function (file, index) { return { path: file.path, size: file.size || 0, name: file.path.split('/').pop(), importIndex: index } })
    const added = store.addPhotoBatch(items)
    let done = 0
    added.forEach(function (photo, index) {
      wx.getImageInfo({ src: files[index].path, success(info) { store.updatePhoto(photo.id, { width: info.width, height: info.height }) } })
      wx.getFileInfo({ filePath: files[index].path, success(info) { store.updatePhoto(photo.id, { digest: info.digest || '' }) }, complete() {
        done += 1
        if (done === added.length) { that.setData({ importing: false }); that.refresh(); wx.showToast({ title: '分析完成', icon: 'success' }); wx.switchTab({ url: '/pages/category/category' }) }
      } })
      const suffix = (files[index].path.match(/\.[a-zA-Z0-9]+$/) || ['.jpg'])[0]
      const target = wx.env.USER_DATA_PATH + '/' + photo.id + suffix
      fs.copyFile({ srcPath: files[index].path, destPath: target, complete() { store.updatePhoto(photo.id, { path: target }) } })
    })
  },
  goDuplicates() { wx.switchTab({ url: '/pages/category/category' }) },
  goLibrary() { wx.switchTab({ url: '/pages/search/search' }) },
  clearReview() { wx.showModal({ title: '清空分析记录', content: '只会清空小程序中的分析记录，不会删除手机相册原图。确定继续吗？', confirmColor: '#d14343', success: res => { if (res.confirm) { store.savePhotos([]); this.refresh(); wx.showToast({ title: '已清空', icon: 'success' }) } } }) }
})
