// Storage layer: IndexedDB wrapper (async)
const DB_NAME = 'catalogo_db_v2'
const STORE = 'products'
const DB_VERSION = 2 // bump to create additional stores (classes)

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' })
        os.createIndex('label', 'label', { unique: false })
        os.createIndex('createdAt', 'createdAt', { unique: false })
        os.createIndex('available', 'available', { unique: false })
      }
      // create classes store for taxonomy
      if (!db.objectStoreNames.contains('classes')) {
        db.createObjectStore('classes', { keyPath: 'id' })
      }
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

// Generic helpers for non-products stores
async function idbGetAllFrom(storeName) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => res(req.result || [])
    req.onerror = () => rej(req.error)
  })
}

async function idbPutTo(storeName, item) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(item)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

// Generic delete for non-products stores
async function idbDeleteFrom(storeName, id) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(id)
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}

async function idbGetAll() {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    req.onsuccess = () => { res(req.result || []) }
    req.onerror = () => rej(req.error)
  })
}

async function idbPut(item) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.put(item)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

async function idbDelete(id) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.delete(id)
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}

async function idbClear() {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.clear()
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }

// Default WhatsApp contact (forced to user's provided number)
const DEFAULT_WA_NUMBER = '553299796446'

function buildWhatsAppLink(phone, template, label, color) {
  const clean = (DEFAULT_WA_NUMBER || '').replace(/[^0-9]/g, '')
  let text = (template || 'Olá! Gostei do item {label}. Quero um desse.').replace('{label}', label || '')
  if (color) {
    if (text.includes('{color}')) {
      text = text.replace('{color}', color)
    } else {
      text = `${text} — Cor: ${color}`
    }
  }
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
}
/* --- Toast Notifications --- */
function showToast(message, type = 'success', duration = 3000) {
  const toast = document.getElementById('toast')
  if (!toast) return
  
  toast.textContent = message
  toast.className = `toast ${type}`
  toast.classList.add('show')
  
  setTimeout(() => {
    toast.classList.remove('show')
  }, duration)
}

/* --- Seed sample if empty --- */
async function seedIfEmpty() {
  const all = await idbGetAll()
  if (all.length > 0) return
  
  showToast('Inicializando catálogo com produtos de exemplo...', 'warning')
  
  const imgFiles = [
    'WhatsApp Image 2025-11-19 at 17.57.13.jpeg',
    'WhatsApp Image 2025-11-19 at 17.57.14.jpeg',
    'WhatsApp Image 2025-11-19 at 17.57.15.jpeg',
    'WhatsApp Image 2025-11-19 at 17.57.16 (1).jpeg',
    'WhatsApp Image 2025-11-19 at 17.57.16.jpeg',
    'WhatsApp Image 2025-11-19 at 17.57.17 (1).jpeg',
    'WhatsApp Image 2025-11-19 at 17.57.17.jpeg'
  ]

  const existingImgs = new Set((all || []).map(p => (p.image_url || '').split('/').pop()))
  const usedLabels = new Set((all || []).map(p => String(p.label)))

  let nextNum = 1
  function nextLabel() {
    while (usedLabels.has(String(nextNum).padStart(4, '0'))) nextNum++
    const lab = String(nextNum).padStart(4, '0')
    usedLabels.add(lab)
    nextNum++
    return lab
  }

  for (let i = 0; i < imgFiles.length; i++) {
    const fname = imgFiles[i]
    if (existingImgs.has(fname)) continue
    const path = `img/produtos/${fname}`
    const label = nextLabel()
    const product = {
      id: uid(),
      label,
      name: `Cabeceira ${Number(label)}`,
      description: 'Cabeceira de alta qualidade, perfeita para complementar seu mobiliário.',
      price: 399 + i * 50,
      seller_phone: '',
      whatsapp_template: 'Olá! Gostei do item {label}. Quero um desse.',
      image_url: path,
      tags: ['cabeceira', 'móvel', 'quarto'],
      available: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await idbPut(product)
  }
  
  showToast('Catálogo inicializado com sucesso!', 'success')
}

/* --- Enhanced Products Rendering --- */
async function renderProductsList() {
  const container = document.getElementById('products')
  const resultsInfo = document.getElementById('results-info')
  const productsCount = document.getElementById('products-count')
  const activeFilters = document.getElementById('active-filters')
  
  if (!container) return

  // Show loading state
  container.innerHTML = `
    <div class="skeleton-cards">
      <div class="card skeleton skeleton-card"></div>
      <div class="card skeleton skeleton-card"></div>
      <div class="card skeleton skeleton-card"></div>
      <div class="card skeleton skeleton-card"></div>
      <div class="card skeleton skeleton-card"></div>
      <div class="card skeleton skeleton-card"></div>
    </div>
  `

  const products = await idbGetAll()
  // class filter comes from sidebar or URL param
  const urlParams = new URLSearchParams(location.search)
  const classFilter = urlParams.get('class') || window.__selectedClass || ''
  const q = (document.getElementById('search')?.value || '').toLowerCase().trim()
  const availability = document.getElementById('filter-availability')?.value || 'all'
  const sortBy = document.getElementById('sort-by')?.value || 'recent'

  let list = products.slice()
  let filterText = []

  if (availability === 'available') {
    list = list.filter(p => p.available !== false)
    filterText.push('Disponíveis')
  }

  if (classFilter) {
    list = list.filter(p => (p.class || '') === classFilter)
    filterText.push(`Classe: ${classFilter}`)
  }

  if (q) {
    list = list.filter(p => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.label || '').toLowerCase().includes(q) || 
      (p.tags || []).join(' ').toLowerCase().includes(q)
    )
    filterText.push(`"${q}"`)
  }

  if (sortBy === 'price-asc') {
    list.sort((a, b) => (a.price || 0) - (b.price || 0))
    filterText.push('Menor preço')
  } else if (sortBy === 'price-desc') {
    list.sort((a, b) => (b.price || 0) - (a.price || 0))
    filterText.push('Maior preço')
  } else {
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    filterText.push('Mais recentes')
  }

  // Update results info
  productsCount.textContent = `${list.length} produto${list.length !== 1 ? 's' : ''} encontrado${list.length !== 1 ? 's' : ''}`
  
  if (filterText.length > 0) {
    activeFilters.innerHTML = filterText.map(text => 
      `<span class="filter-tag">${escapeHtml(text)}</span>`
    ).join('')
  } else {
    activeFilters.innerHTML = ''
  }

  container.innerHTML = ''
  
  if (list.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <h3 style="color: var(--muted); margin-bottom: 8px;">Nenhum produto encontrado</h3>
        <p style="color: var(--muted-light);">Tente ajustar os filtros ou termos de busca.</p>
      </div>
    `
    return
  }

  list.forEach(p => {
    const card = document.createElement('article')
    card.className = `card compact ${p.available === false ? 'unavailable' : ''}`
    card.setAttribute('data-label', p.label)

    const imgHtml = p.image_url ? `<img src="${escapeHtmlAttr(p.image_url)}" alt="${escapeHtmlAttr(p.name)}" loading="lazy">` : `<div class="no-image"><span class="material-icons-round">photo_camera</span></div>`

    const shortDesc = (p.description || '').split('.').slice(0,1).join('').trim().slice(0,240)

    card.innerHTML = `
      <div class="card-img">${imgHtml}</div>
      <a class="product-link" href="product.html?id=${p.id}"><h3 class="title">${escapeHtml(p.name)}</h3></a>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:8px;">
        <div class="price">${formatCurrency(p.price || 0)}</div>
        <div class="actions">
          <a class="btn-ghost" href="product.html?id=${p.id}" aria-label="Ver detalhes"><span class="material-icons-round">visibility</span></a>
          <button class="btn-primary" data-id="${p.id}" data-action="add-cart" aria-label="Adicionar ao carrinho"><span class="material-icons-round">add_shopping_cart</span></button>
        </div>
      </div>

      <div class="desc">${escapeHtml(shortDesc)}${(p.description||'').length>shortDesc.length ? '...' : ''}</div>
    `

    container.appendChild(card)
  })
}

/* --- Enhanced Product Modal --- */
async function openProductModal(id) {
  const products = await idbGetAll()
  const p = products.find(x => x.id === id)
  if (!p) return

  const body = document.getElementById('modal-body')
  const modal = document.getElementById('product-modal')
  
  body.innerHTML = `
    <div class="card-img" style="max-height: 400px;">
      ${p.image_url ? `<img src="${escapeHtmlAttr(p.image_url)}" alt="${escapeHtmlAttr(p.name)}">` : `<div class="no-image"><span class="material-icons-round" aria-hidden="true">photo_camera</span> Sem imagem</div>`}
    </div>
    <h2 class="title">${escapeHtml(p.name)} <span class="small-muted">(#${escapeHtml(p.label)})</span></h2>
    <div class="desc">${escapeHtml(p.description || '')}</div>
    <div class="product-meta">${(p.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ')}</div>
    <div class="price" style="font-size: 1.5rem; margin: 20px 0;">${formatCurrency(p.price || 0)}</div>
    ${p.colors && p.colors.length ? `<div class="colors-row" style="margin: 12px 0;">Cores: ${p.colors.map(c => `<button class="color-option" data-color="${escapeHtmlAttr(c)}" type="button" style="margin-right:6px;">${escapeHtml(c)}</button>`).join('')}</div>` : ''}
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <button class="btn-ghost" id="modal-add-cart" data-id="${p.id}" data-action="add-cart" ${p.available === false ? 'disabled' : ''}>
        <span class="material-icons-round" aria-hidden="true">add_shopping_cart</span> Adicionar ao carrinho
      </button>
      <a id="modal-wpp" class="btn-primary" href="${buildWhatsAppLink(null, p.whatsapp_template, p.label)}" target="_blank" rel="noreferrer" style="flex: 1;" ${p.available === false ? 'style="opacity: 0.6; pointer-events: none;"' : ''}>
        <span class="material-icons-round" aria-hidden="true">chat</span> Chamar no WhatsApp
      </a>
    </div>
  `
  
  modal.setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'

  // Handle color selection inside modal
  (function() {
    let selected = (p.colors && p.colors[0]) || ''
    const colorButtons = body.querySelectorAll('.color-option')
    colorButtons.forEach((btn, idx) => {
      if (btn.dataset.color === selected) btn.classList.add('active')
      btn.addEventListener('click', () => {
        colorButtons.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        selected = btn.dataset.color
        // update add-cart dataset and whatsapp link
        const addBtn = document.getElementById('modal-add-cart')
        if (addBtn) addBtn.dataset.color = selected
        const wpp = document.getElementById('modal-wpp')
        if (wpp) wpp.href = buildWhatsAppLink(null, p.whatsapp_template, p.label, selected)
      })
    })
    // initialize link with default color
    if (selected) {
      const wpp = document.getElementById('modal-wpp')
      if (wpp) wpp.href = buildWhatsAppLink(null, p.whatsapp_template, p.label, selected)
      const addBtn = document.getElementById('modal-add-cart')
      if (addBtn) addBtn.dataset.color = selected
    }
  })()
}

function closeProductModal() {
  const modal = document.getElementById('product-modal')
  if (modal) {
    modal.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
  }
}

/* --- Enhanced Admin --- */
async function setupAdmin() {
  const form = document.getElementById('product-form')
  if (!form) return

  if (!requireAuthOnAdmin()) return

  const elements = {
    id: document.getElementById('product-id'),
    label: document.getElementById('label'),
    name: document.getElementById('name'),
    description: document.getElementById('description'),
    price: document.getElementById('price'),
    // seller_phone removed — we use global DEFAULT_WA_NUMBER
    whatsapp_template: document.getElementById('whatsapp_template'),
    image_url: document.getElementById('image_url'),
    image_file: document.getElementById('image_file'),
    image_preview: document.getElementById('image-preview'),
    product_class: document.getElementById('product-class'),
    add_class_btn: document.getElementById('add-class-btn'),
    tags: document.getElementById('tags'),
    colors: document.getElementById('colors'),
    resetBtn: document.getElementById('reset-btn')
  }

  async function renderAdminList() {
    const list = document.getElementById('admin-list')
    const products = await idbGetAll()
    
    if (products.length === 0) {
      list.innerHTML = '<div class="small-muted" style="text-align: center; padding: 40px;">Nenhum produto cadastrado</div>'
      return
    }
    
    list.innerHTML = products.map(p => `
      <div class="admin-list-item ${p.available === false ? 'unavailable' : ''}">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <strong>${escapeHtml(p.name)}</strong>
            <span class="small-muted">(#${escapeHtml(p.label)})</span>
            ${p.available === false ? '<span style="color: var(--error); font-size: 0.8rem;">[Indisponível]</span>' : ''}
          </div>
          <div class="small-muted" style="margin-bottom: 4px;">${escapeHtml(p.description || '')}</div>
          <div style="font-weight: 600; color: var(--text);">${formatCurrency(p.price || 0)}</div>
          <div class="small-muted" style="margin-top:6px;">Classe: ${escapeHtml(p.class || '')} ${p.colors && p.colors.length ? '| Cores: ' + p.colors.map(c=>escapeHtml(c)).join(', ') : ''}</div>
        </div>
        <div class="flex">
          <button class="btn-ghost" data-id="${p.id}" data-action="edit"><span class="material-icons-round" aria-hidden="true">edit</span> Editar</button>
          <button class="btn-ghost" data-id="${p.id}" data-action="toggle-availability">
            ${p.available === false ? '<span class="material-icons-round" aria-hidden="true">toggle_on</span> Disponibilizar' : '<span class="material-icons-round" aria-hidden="true">pause_circle</span> Suspender'}
          </button>
          <button class="btn-ghost" data-id="${p.id}" data-action="delete" style="color: var(--error);"><span class="material-icons-round" aria-hidden="true">delete</span> Remover</button>
        </div>
      </div>
    `).join('')
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    
    const products = await idbGetAll()
    const existingProduct = elements.id.value ? products.find(p => p.id === elements.id.value) : null
    
    const payload = {
      id: elements.id.value || uid(),
      label: elements.label.value.trim(),
      name: elements.name.value.trim(),
      description: elements.description.value.trim(),
      price: Number(elements.price.value) || 0,
      // seller_phone removed — using global DEFAULT_WA_NUMBER
      whatsapp_template: elements.whatsapp_template.value.trim() || 'Olá! Gostei do item {label}. Quero um desse.',
      image_url: elements.image_url.value.trim(),
      tags: elements.tags.value.split(',').map(s => s.trim()).filter(Boolean),
      class: elements.product_class?.value || '',
      colors: (elements.colors?.value || '').split(',').map(s => s.trim()).filter(Boolean),
      available: existingProduct ? existingProduct.available : true,
      createdAt: existingProduct ? existingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    await idbPut(payload)
    form.reset()
    elements.id.value = ''
    await renderAdminList()
    await renderProductsList()
    showToast('Produto salvo com sucesso!')
  })

  // Populate classes select
  async function populateClasses() {
    const classes = await idbGetAllFrom('classes')
    const sel = elements.product_class
    if (!sel) return
    const current = sel.value
    sel.innerHTML = '<option value="">-- Nenhuma --</option>' + classes.map(c => `<option value="${escapeHtmlAttr(c.name)}">${escapeHtml(c.name)}</option>`).join('')
    if (current) sel.value = current
  }

  elements.add_class_btn.addEventListener('click', async () => {
    const name = prompt('Nome da nova classe:')
    if (!name) return
    await idbPutTo('classes', { id: uid(), name: name.trim() })
    await populateClasses()
    showToast('Classe adicionada', 'success')
  })

  // Image upload / drag & drop
  const drop = document.getElementById('image-drop')
  if (drop) {
    drop.addEventListener('click', () => elements.image_file.click())
    drop.addEventListener('dragover', (ev) => { ev.preventDefault(); drop.classList.add('dragover') })
    drop.addEventListener('dragleave', () => drop.classList.remove('dragover'))
    drop.addEventListener('drop', async (ev) => {
      ev.preventDefault(); drop.classList.remove('dragover')
      const f = ev.dataTransfer.files && ev.dataTransfer.files[0]
      if (f) await handleImageFile(f)
    })
  }

  elements.image_file.addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0]
    if (f) await handleImageFile(f)
  })

  async function handleImageFile(file) {
    try {
      const fd = new FormData()
      fd.append('imagem', file)
      const res = await fetch('/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload falhou')
      const json = await res.json()
      const path = json.path || (`img/produtos/${json.arquivo}`)
      elements.image_url.value = path
      if (elements.image_preview) {
        elements.image_preview.src = path
        elements.image_preview.style.display = 'block'
      }
      showToast('Imagem enviada com sucesso', 'success')
    } catch (e) {
      console.error(e)
      showToast('Erro ao enviar imagem: ' + e.message, 'error')
    }
  }

  await populateClasses()

  elements.resetBtn.addEventListener('click', () => {
    form.reset()
    elements.id.value = ''
    showToast('Formulário limpo', 'warning')
  })

  document.getElementById('admin-list').addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button')
    if (!btn) return
    
    const id = btn.dataset.id
    const action = btn.dataset.action
    const products = await idbGetAll()
    const p = products.find(x => x.id === id)
    
    if (!p) return

    if (action === 'edit') {
      elements.id.value = p.id
      elements.label.value = p.label
      elements.name.value = p.name
      elements.description.value = p.description
      elements.price.value = p.price
      elements.whatsapp_template.value = p.whatsapp_template
      elements.image_url.value = p.image_url
      if (elements.image_preview) {
        if (p.image_url) { elements.image_preview.src = p.image_url; elements.image_preview.style.display = 'block' } else { elements.image_preview.style.display = 'none' }
      }
      elements.tags.value = (p.tags || []).join(', ')
      if (elements.product_class) elements.product_class.value = p.class || ''
      if (elements.colors) elements.colors.value = (p.colors || []).join(', ')
      
      window.scrollTo({ top: 0, behavior: 'smooth' })
      showToast(`Editando: ${p.name}`)
    }
    
    if (action === 'toggle-availability') {
      p.available = !p.available
      p.updatedAt = new Date().toISOString()
      await idbPut(p)
      await renderAdminList()
      await renderProductsList()
      showToast(`Produto ${p.available ? 'disponibilizado' : 'suspenso'}`, 'warning')
    }
    
    if (action === 'delete') {
      if (!confirm(`Tem certeza que deseja remover "${p.name}"?`)) return
      await idbDelete(id)
      await renderAdminList()
      await renderProductsList()
      showToast('Produto removido', 'error')
    }
  })

  // Export/Import
  document.getElementById('export-btn').addEventListener('click', async () => {
    const data = JSON.stringify(await idbGetAll(), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `produtos-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    showToast('Catálogo exportado com sucesso!')
  })

  document.getElementById('import-file').addEventListener('change', async (ev) => {
    const file = ev.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const imported = JSON.parse(reader.result)
        if (!Array.isArray(imported)) throw new Error('Formato inválido: deve ser um array de produtos')
        
        if (!confirm(`Importar ${imported.length} produto(s)? Isso substituirá todos os produtos atuais.`)) {
          ev.target.value = ''
          return
        }
        
        await idbClear()
        for (const p of imported) {
          if (!p.id) p.id = uid()
          if (!p.createdAt) p.createdAt = new Date().toISOString()
          p.updatedAt = new Date().toISOString()
          await idbPut(p)
        }
        
        await renderAdminList()
        await renderProductsList()
        ev.target.value = ''
        showToast(`Importação concluída: ${imported.length} produto(s)`, 'success')
      } catch (e) {
        showToast('Erro ao importar: ' + e.message, 'error')
        ev.target.value = ''
      }
    }
    reader.readAsText(file)
  })

  await renderAdminList()
}

// Render class sidebar for public pages
async function renderClassSidebar() {
  const el = document.getElementById('class-list')
  if (!el) return
  const classes = await idbGetAllFrom('classes')
  const allBtn = document.createElement('button')
  allBtn.className = 'btn-ghost'
  allBtn.textContent = 'Todas'
  allBtn.addEventListener('click', () => {
    window.__selectedClass = ''
    history.replaceState(null, '', location.pathname)
    renderProductsList()
  })

  el.innerHTML = ''
  el.appendChild(allBtn)

  classes.forEach(c => {
    const wrap = document.createElement('div')
    wrap.className = 'class-item'

    const b = document.createElement('button')
    b.className = 'btn-ghost class-select'
    b.textContent = c.name
    b.addEventListener('click', () => {
      window.__selectedClass = c.name
      const qp = new URLSearchParams(location.search)
      qp.set('class', c.name)
      history.replaceState(null, '', location.pathname + '?' + qp.toString())
      renderProductsList()
    })

    const isAdmin = isAuthenticated()

    const del = isAdmin ? document.createElement('button') : null
    if (isAdmin) {
      del.className = 'btn-ghost class-delete'
      del.title = 'Excluir classe'
      del.innerHTML = '<span class="material-icons-round" aria-hidden="true">delete</span>'
      del.addEventListener('click', async (ev) => {
        ev.stopPropagation()
        if (!confirm(`Remover a classe "${c.name}"? Isso também removerá essa categoria de todos os produtos.`)) return
        try {
          // delete class from classes store
          await idbDeleteFrom('classes', c.id)

          // clear the class field from products that referenced it
          const products = await idbGetAll()
          const toUpdate = products.filter(p => (p.class || '') === c.name)
          await Promise.all(toUpdate.map(p => {
            p.class = ''
            p.updatedAt = new Date().toISOString()
            return idbPut(p)
          }))

          // If current selected class was deleted, clear filter
          if (window.__selectedClass === c.name) {
            window.__selectedClass = ''
            history.replaceState(null, '', location.pathname)
          }

          await renderClassSidebar()
          await renderProductsList()
          showToast('Classe removida e associações limpas', 'warning')
        } catch (e) {
          console.error(e)
          showToast('Erro ao remover classe', 'error')
        }
      })
    }

    wrap.appendChild(b)
    if (del) wrap.appendChild(del)
    el.appendChild(wrap)
  })
}

/* --- Utilities --- */
function escapeHtml(s) { 
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" })[c]) 
}

function escapeHtmlAttr(s) { 
  return String(s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function formatCurrency(v) { 
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) 
}

/* --- Enhanced Cart System --- */
function getCart() { 
  try { 
    return JSON.parse(localStorage.getItem('cart_v2') || '[]') 
  } catch (e) { 
    return [] 
  } 
}

function saveCart(cart) { 
  localStorage.setItem('cart_v2', JSON.stringify(cart))
  updateCartCount()
}

function updateCartCount() {
  const cart = getCart()
  const total = cart.reduce((s, i) => s + i.qty, 0)
  const el = document.getElementById('cart-count')
  const btn = document.getElementById('cart-btn')
  const headerBadge = document.getElementById('header-cart-count')
  
  if (el) el.textContent = total
  if (btn) {
    if (total > 0) {
      btn.classList.add('has-items')
    } else {
      btn.classList.remove('has-items')
    }
  }
  if (headerBadge) headerBadge.textContent = total
  const fel = document.getElementById('floating-cart-count')
  if (fel) fel.textContent = total
}

function addToCart(productId, qty = 1, opts = {}) {
  const color = opts.color || null
  const cart = getCart()
  const key = `${productId}||${color || ''}`
  const item = cart.find(c => c.key === key)

  if (item) {
    item.qty += qty
  } else {
    cart.push({ key, id: productId, qty, color, addedAt: new Date().toISOString() })
  }

  saveCart(cart)
  showToast('Produto adicionado ao carrinho!')
}

function removeFromCart(itemKey) {
  let cart = getCart()
  const item = cart.find(c => c.key === itemKey)
  cart = cart.filter(c => c.key !== itemKey)
  saveCart(cart)
  renderCartModal()

  if (item) {
    showToast('Produto removido do carrinho', 'warning')
  }
}

function changeQty(itemKey, qty) {
  const cart = getCart()
  const item = cart.find(c => c.key === itemKey)
  if (!item) return

  if (qty <= 0) {
    removeFromCart(itemKey)
  } else {
    item.qty = qty
    saveCart(cart)
    renderCartModal()
  }
}

async function renderCartModal() {
  const body = document.getElementById('cart-body')
  if (!body) return
  
  const cart = getCart()
  const products = await idbGetAll()
  
  if (cart.length === 0) {
    body.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--muted);">
          <div style="font-size: 3rem; margin-bottom: 16px;"><span class="material-icons-round" aria-hidden="true" style="font-size:3rem">shopping_cart</span></div>
          <h3 style="margin-bottom: 8px;">Carrinho vazio</h3>
          <p>Adicione alguns produtos para ver aqui!</p>
        </div>
    `
    updateCartCount()
    return
  }
  
  const cartItems = cart.map(ci => {
    const p = products.find(x => x.id === ci.id)
    if (!p) return ''
    const colorLine = ci.color ? `<div class="small-muted" style="margin-top:6px;">Cor: ${escapeHtml(ci.color)}</div>` : ''
    return `
      <div class="admin-list-item">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <strong>${escapeHtml(p.name)}</strong>
            <span class="small-muted">(#${escapeHtml(p.label)})</span>
          </div>
          <div class="small-muted" style="margin-bottom: 4px;">${escapeHtml(p.description || '')}</div>
          <div style="font-weight: 600; color: var(--text);">${formatCurrency(p.price || 0)}</div>
          ${colorLine}
        </div>
        <div class="flex" style="align-items: center; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
              <button class="btn-ghost" data-key="${ci.key}" data-action="decrease" style="padding: 4px 8px; font-size: 1.2rem; min-height: 44px;">−</button>
            <input type="number" min="1" data-key="${ci.key}" class="cart-qty" value="${ci.qty}" style="width: 60px; text-align: center; padding: 4px; min-height: 44px;">
              <button class="btn-ghost" data-key="${ci.key}" data-action="increase" style="padding: 4px 8px; font-size: 1.2rem; min-height: 44px;">+</button>
          </div>
            <button class="btn-ghost" data-key="${ci.key}" data-action="remove" style="color: var(--error); min-height: 44px;"><span class="material-icons-round" aria-hidden="true">delete</span></button>
        </div>
      </div>
    `
  }).join('')
  
  const total = cart.reduce((sum, ci) => {
    const p = products.find(x => x.id === ci.id)
    return sum + ((p?.price || 0) * ci.qty)
  }, 0)
  
  body.innerHTML = `
    <div style="max-height: 400px; overflow-y: auto;">
      ${cartItems}
    </div>
    <div style="border-top: 2px solid var(--border); padding-top: 20px; margin-top: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <strong style="font-size: 1.2rem;">Total:</strong>
        <strong style="font-size: 1.5rem; color: var(--text);">${formatCurrency(total)}</strong>
      </div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button id="cart-whatsapp" class="btn-primary" style="flex: 2; min-height: 44px;">
          <span class="material-icons-round" aria-hidden="true">chat</span> Enviar pedido via WhatsApp
        </button>
        <button id="cart-clear" class="btn-ghost" style="flex: 1; min-height: 44px;">
          <span class="material-icons-round" aria-hidden="true">delete</span> Limpar
        </button>
      </div>
    </div>
  `
  
  updateCartCount()
  
  // Attach event listeners
  body.querySelectorAll('.cart-qty').forEach(inp => {
    inp.addEventListener('change', (ev) => {
      const key = ev.target.dataset.key
      const v = Number(ev.target.value) || 1
      changeQty(key, v)
    })
  })
  
  body.querySelectorAll('button[data-action="increase"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key
      const cartNow = getCart()
      const item = cartNow.find(c => c.key === key)
      if (item) changeQty(key, item.qty + 1)
    })
  })
  
  body.querySelectorAll('button[data-action="decrease"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key
      const cartNow = getCart()
      const item = cartNow.find(c => c.key === key)
      if (item) changeQty(key, item.qty - 1)
    })
  })
  
  body.querySelectorAll('button[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.key))
  })
  
  document.getElementById('cart-clear').addEventListener('click', () => {
    if (confirm('Limpar todo o carrinho?')) {
      localStorage.removeItem('cart_v2')
      renderCartModal()
      updateCartCount()
      showToast('Carrinho limpo', 'warning')
    }
  })
  
  document.getElementById('cart-whatsapp').addEventListener('click', async () => {
    const cartNow = getCart()
    const productsAll = await idbGetAll()
    
    if (cartNow.length === 0) {
      showToast('Carrinho vazio!', 'error')
      return
    }
    
    const items = cartNow.map(ci => {
      const p = productsAll.find(x => x.id === ci.id)
      if (!p) return `Produto ${ci.id}`
      const colorText = ci.color ? ` - cor: ${ci.color}` : ''
      return `${p.name}${colorText} (${ci.qty}x - ${formatCurrency((p.price || 0) * ci.qty)})`
    })
    
    const total = cartNow.reduce((sum, ci) => {
      const p = productsAll.find(x => x.id === ci.id)
      return sum + ((p?.price || 0) * ci.qty)
    }, 0)
    
    const message = `Olá! Gostaria de fazer um pedido com os seguintes itens:\n\n${items.join('\n')}\n\n*Total: ${formatCurrency(total)}*\n\nPor favor, me informe sobre a disponibilidade e formas de pagamento.`
    
    const clean = (DEFAULT_WA_NUMBER || '').replace(/[^0-9]/g, '')
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
    
    window.open(url, '_blank')
  })
}

function buildWhatsAppCartLink(labels) {
  const clean = (DEFAULT_WA_NUMBER || '').replace(/[^0-9]/g, '')
  const list = labels.join(', ')
  let text = ''
  
  if (!labels || labels.length === 0) {
    text = 'Olá, tenho interesse em alguns produtos do catálogo.'
  } else if (labels.length === 1) {
    text = `Olá! Gostei do item ${list}. Quero um desse.`
  } else {
    text = `Olá! Gostei dos itens: ${list}. Vou querer todos.`
  }
  
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
}

/* --- Auth System --- */
function isAuthenticated() {
  return sessionStorage.getItem('admin_auth') === '1'
}

function showAdminControls() {
  const adminLink = document.getElementById('admin-link')
  
  if (isAuthenticated()) {
    if (adminLink) adminLink.style.display = ''
  } else {
    if (adminLink) adminLink.style.display = 'none'
  }
}

function requireAuthOnAdmin() {
  const path = location.pathname.split('/').pop()
  if (path === 'admin.html' && !isAuthenticated()) {
    location.href = 'login.html'
    return false
  }
  return true
}

/* --- Global Initialization --- */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Inicializando Catálogo Online...')
  
  try {
    // Initialize core functionality
    await seedIfEmpty()
    await migrateNamesToCabeceiraCompact()
    await renderProductsList()
    await renderClassSidebar()
    await setupAdmin()
    
    // Event listeners for main page
    document.getElementById('search')?.addEventListener('input', debounce(renderProductsList, 300))
    document.getElementById('filter-availability')?.addEventListener('change', renderProductsList)
    document.getElementById('sort-by')?.addEventListener('change', renderProductsList)
    
    // Product interactions
    document.getElementById('products')?.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button')
      if (!btn) return
      
      const id = btn.dataset.id
      const action = btn.dataset.action
      
      if (action === 'details') openProductModal(id)
      if (action === 'add-cart') {
        const color = btn.dataset.color || null
        addToCart(id, 1, { color })
      }
    })

    // Global fallback for add-cart buttons that are outside #products (e.g. modal)
    document.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button')
      if (!btn) return
      // if inside #products, ignore (already handled)
      if (btn.closest('#products')) return
      const action = btn.dataset.action
      if (action === 'add-cart') {
        const id = btn.dataset.id
        const color = btn.dataset.color || null
        if (id) addToCart(id, 1, { color })
      }
    })
    
    // Modal controls
    document.getElementById('modal-close')?.addEventListener('click', closeProductModal)
    document.getElementById('product-modal')?.addEventListener('click', (ev) => {
      if (ev.target === ev.currentTarget) closeProductModal()
    })
    
    // Cart controls
    document.getElementById('cart-btn')?.addEventListener('click', () => {
      renderCartModal()
      const modal = document.getElementById('cart-modal')
      if (modal) {
        modal.setAttribute('aria-hidden', 'false')
        document.body.style.overflow = 'hidden'
      }
    })
    
    document.getElementById('cart-close')?.addEventListener('click', () => {
      const modal = document.getElementById('cart-modal')
      if (modal) {
        modal.setAttribute('aria-hidden', 'true')
        document.body.style.overflow = ''
      }
    })
    
    document.getElementById('cart-modal')?.addEventListener('click', (ev) => {
      if (ev.target === ev.currentTarget) {
        ev.currentTarget.setAttribute('aria-hidden', 'true')
        document.body.style.overflow = ''
      }
    })
    // floating cart (small floating button)
    document.getElementById('floating-cart-btn')?.addEventListener('click', () => {
      renderCartModal()
      const modal = document.getElementById('cart-modal')
      if (modal) {
        modal.setAttribute('aria-hidden', 'false')
        document.body.style.overflow = 'hidden'
      }
    })
    
    // Initialize auth and cart
    showAdminControls()
    requireAuthOnAdmin()
    updateCartCount()

    // Search toggle (header magnifier)
    const searchToggle = document.getElementById('search-toggle')
    const searchContainer = document.querySelector('.search-container')
    if (searchToggle) {
      searchToggle.addEventListener('click', (ev) => {
        ev.stopPropagation()
        const open = document.body.classList.toggle('search-open')
        searchToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
        if (open) {
          // focus input after opening
          setTimeout(() => document.getElementById('search')?.focus(), 50)
        }
      })
    }

    // Close search when clicking outside
    document.addEventListener('click', (ev) => {
      if (!document.body.classList.contains('search-open')) return
      const inside = ev.target.closest('.search-container') || ev.target.closest('#search-toggle')
      if (!inside) {
        document.body.classList.remove('search-open')
        document.getElementById('search-toggle')?.setAttribute('aria-expanded', 'false')
      }
    })

    // Close on Escape
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && document.body.classList.contains('search-open')) {
        document.body.classList.remove('search-open')
        document.getElementById('search-toggle')?.setAttribute('aria-expanded', 'false')
      }
    })
    
    console.log('Catálogo Online inicializado com sucesso!')

    // Mark active nav link (works across pages)
    try {
      document.querySelectorAll('.main-nav .nav-link').forEach(a => {
        try {
          const aPath = new URL(a.href, location.origin).pathname.replace(/\/+$/, '')
          const cur = location.pathname.replace(/\/+$/, '')
          if (aPath === cur || (aPath === '/index.html' && (cur === '/' || cur === '/index.html'))) {
            a.classList.add('active')
          } else {
            a.classList.remove('active')
          }
        } catch (e) { /* ignore */ }
      })
    } catch (e) { /* ignore */ }

  } catch (error) {
    console.error('Erro na inicialização:', error)
    showToast('Erro ao carregar o catálogo', 'error')
  }
})

/* --- Migration Functions --- */
async function migrateNamesToCabeceiraCompact() {
  const products = await idbGetAll()
  let changed = false
  
  for (const p of products) {
    const fname = (p.image_url || '').split('/').pop() || ''
    if (!fname.startsWith('WhatsApp Image')) continue
    
    const num = Number(String(p.label || '').replace(/^0+/, '') || '')
    if (!num) continue
    
    const desired = `Cabeceira ${num}`
    if (p.name !== desired) {
      p.name = desired
      p.updatedAt = new Date().toISOString()
      await idbPut(p)
      changed = true
    }
  }
  
  if (changed) {
    console.info('Migration: nomes de cabeceira atualizados')
  }
}

/* --- Utility Functions --- */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Keyboard accessibility
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    closeProductModal()
    const cartModal = document.getElementById('cart-modal')
    if (cartModal && cartModal.getAttribute('aria-hidden') === 'false') {
      cartModal.setAttribute('aria-hidden', 'true')
      document.body.style.overflow = ''
    }
  }
})