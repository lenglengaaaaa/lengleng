const store = require('../../utils/photo-store')
const app = getApp()
const GRID_COLUMNS_KEY = 'ai_photo_organizer_grid_columns'
const RECENT_BATCH_LIMIT = 20

Page({
  data: { photos: [], batches: [], mappedPhotos: [], kw: '', total: 0, gridColumns: 4, activeBatchId: '', activeBatchCount: 0, batchHint: '' },
  onShow() { this.refresh() },
  refresh() {
    const photos = store.loadPhotos().map(store.enrichPhoto)
    const batches = this.getRecentBatches(photos)
    const savedColumns = Number(wx.getStorageSync(GRID_COLUMNS_KEY))
    const gridColumns = [3, 4, 5].indexOf(savedColumns) >= 0 ? savedColumns : this.data.gridColumns
    const activeBatchId = batches.some(function (batch) { return batch.id === this.data.activeBatchId }, this) ? this.data.activeBatchId : (batches[0] ? batches[0].id : '')
    this.setData({ photos, batches, total: photos.length, gridColumns, activeBatchId })
    this.refreshMap()
  },
  getRecentBatches(photos) {
    const entries = {}
    photos.forEach(function (photo) {
      const id = photo.importBatchId || ('legacy_' + (photo.importedAt || photo.id))
      if (!entries[id]) entries[id] = { id, photos: [], time: Number(photo.importedAt) || 0 }
      entries[id].photos.push(photo)
      entries[id].time = Math.max(entries[id].time, Number(photo.importedAt) || 0)
    })
    return Object.keys(entries).map(function (id) {
      const batch = entries[id]
      batch.photos.sort(function (left, right) { return (left.importIndex || 0) - (right.importIndex || 0) })
      batch.label = this.formatBatchLabel(batch.time, batch.photos.length)
      return batch
    }, this).sort(function (left, right) { return right.time - left.time }).slice(0, RECENT_BATCH_LIMIT)
  },
  formatBatchLabel(time, count) {
    const date = new Date(time || Date.now())
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return month + '/' + day + ' ' + hour + ':' + minute + ' · ' + count + '张'
  },
  getActiveBatch() { return this.data.batches.filter(function (batch) { return batch.id === this.data.activeBatchId }, this)[0] || { photos: [] } },
  refreshMap() {
    const batch = this.getActiveBatch()
    const mappedPhotos = this.buildMappedPhotos(batch.photos, this.data.gridColumns, this.data.kw)
    this.setData({ mappedPhotos, activeBatchCount: batch.photos.length, batchHint: batch.photos.length ? '坐标只在当前导入批次内计算；不是手机系统相册的真实坐标。' : '' })
  },
  buildMappedPhotos(photos, gridColumns, keyword) {
    const suggestions = {}
    store.duplicateGroups(this.data.photos).forEach(function (group) {
      group.photos.forEach(function (photo) {
        suggestions[photo.id] = { digest: group.digest, batchId: group.batchId, label: photo.id === group.recommendedKeepId ? '建议保留' : '建议清理', kind: photo.id === group.recommendedKeepId ? 'keep' : 'remove' }
      })
    })
    const key = (keyword || '').trim().toLowerCase()
    return photos.map(function (photo, index) {
      const suggestion = suggestions[photo.id]
      const row = Math.floor(index / gridColumns) + 1
      const column = (index % gridColumns) + 1
      return Object.assign({}, photo, {
        sequenceText: String(index + 1).padStart(2, '0'), locationText: '第 ' + row + ' 行 · 第 ' + column + ' 列',
        suggestionLabel: suggestion ? suggestion.label : '', suggestionKind: suggestion ? suggestion.kind : '',
        suggestionDigest: suggestion ? suggestion.digest : '', suggestionBatchId: suggestion ? suggestion.batchId : '', mapClass: suggestion ? 'map-' + suggestion.kind : ''
      })
    }).filter(function (photo) { return !key || (photo.name + ' ' + photo.sequenceText).toLowerCase().indexOf(key) >= 0 })
  },
  onInput(e) { this.setData({ kw: e.detail.value }); this.refreshMap() },
  clear() { this.setData({ kw: '' }); this.refreshMap() },
  selectBatch(e) { this.setData({ activeBatchId: e.currentTarget.dataset.batchId, kw: '' }); this.refreshMap() },
  setGridColumns(e) {
    const gridColumns = Number(e.currentTarget.dataset.columns)
    if ([3, 4, 5].indexOf(gridColumns) < 0) return
    wx.setStorageSync(GRID_COLUMNS_KEY, gridColumns); this.setData({ gridColumns }); this.refreshMap()
  },
  preview(e) { wx.previewImage({ current: e.currentTarget.dataset.src, urls: this.data.mappedPhotos.map(function (item) { return item.path }) }) },
  openDuplicateGroup(e) { const digest = e.currentTarget.dataset.digest; const batchId = e.currentTarget.dataset.batchId; if (!digest || !batchId) return; app.globalData.selectedDigest = digest; app.globalData.selectedBatchId = batchId; wx.switchTab({ url: '/pages/category/category' }) },
  removeRecord(e) { const id = e.currentTarget.dataset.id; wx.showModal({ title: '移除分析记录', content: '只移除小程序中的记录，不会删除手机相册原图。', confirmColor: '#d14343', success: res => { if (res.confirm) { store.removePhotoRecord(id); this.refresh() } } }) }
})