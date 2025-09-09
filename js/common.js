// Firebase 配置 - 请替换为你的配置
const firebaseConfig = {
  apiKey: "AIzaSyAEG2wLSKT39ESNuJOPo81HSIysLoHY6yE",
  authDomain: "xundao-alliance.firebaseapp.com",
  databaseURL: "https://xundao-alliance-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xundao-alliance",
  storageBucket: "xundao-alliance.firebasestorage.app",
  messagingSenderId: "120992896477",
  appId: "1:120992896477:web:871586845b512b24c3d234",
  measurementId: "G-7VP8EMP17D"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 全局变量
window.allianceSystem = {
    allianceData: [],
    pendingData: [],
    isAdmin: false,
    connectionStatus: false,
    currentUser: null
};

// 连接状态监听
function initConnectionMonitoring() {
    const connectedRef = database.ref('.info/connected');
    connectedRef.on('value', (snapshot) => {
        window.allianceSystem.connectionStatus = snapshot.val() === true;
        updateConnectionStatus();
    });
}

// 更新连接状态显示
function updateConnectionStatus() {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;
    
    if (window.allianceSystem.connectionStatus) {
        statusEl.textContent = '● 已连接';
        statusEl.className = 'connection-status connected';
    } else {
        statusEl.textContent = '● 连接断开';
        statusEl.className = 'connection-status disconnected';
    }
}

// 初始化数据监听
function initDataListeners() {
    // 监听妖盟数据
    database.ref('alliances').on('value', (snapshot) => {
        const data = snapshot.val();
        window.allianceSystem.allianceData = data ? Object.values(data).map((item, index) => ({
            ...item,
            firebaseKey: Object.keys(data)[index]
        })) : [];
        
        // 触发数据更新事件
        window.dispatchEvent(new CustomEvent('allianceDataUpdated'));
    });

    // 监听待审核数据
    database.ref('pending').on('value', (snapshot) => {
        const data = snapshot.val();
        window.allianceSystem.pendingData = data ? Object.values(data).map((item, index) => ({
            ...item,
            firebaseKey: Object.keys(data)[index]
        })) : [];
        
        // 触发待审核数据更新事件
        window.dispatchEvent(new CustomEvent('pendingDataUpdated'));
    });
}

// 保存妖盟数据到Firebase
async function saveAllianceData(data) {
    try {
        // 检查是否已存在相同山头和妖盟的数据
        const snapshot = await database.ref('alliances').once('value');
        const alliances = snapshot.val() || {};
        
        let existingKey = null;
        for (const [key, alliance] of Object.entries(alliances)) {
            if (alliance.mountain === data.mountain && alliance.alliance === data.alliance) {
                existingKey = key;
                break;
            }
        }
        
        if (existingKey) {
            await database.ref(`alliances/${existingKey}`).set(data);
        } else {
            await database.ref('alliances').push(data);
        }
        return true;
    } catch (error) {
        console.error('保存妖盟数据失败:', error);
        showToast('保存数据失败，请检查网络连接', 'error');
        return false;
    }
}

// 保存待审核数据到Firebase
async function savePendingData(data) {
    try {
        await database.ref('pending').push(data);
        return true;
    } catch (error) {
        console.error('保存待审核数据失败:', error);
        showToast('提交数据失败，请检查网络连接', 'error');
        return false;
    }
}

// 删除妖盟数据
async function deleteAllianceData(mountain, alliance) {
    try {
        const snapshot = await database.ref('alliances').once('value');
        const alliances = snapshot.val() || {};
        
        for (const [key, data] of Object.entries(alliances)) {
            if (data.mountain === mountain && data.alliance === alliance) {
                await database.ref(`alliances/${key}`).remove();
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('删除妖盟数据失败:', error);
        showToast('删除数据失败，请检查网络连接', 'error');
        return false;
    }
}

// 删除待审核数据
async function deletePendingData(firebaseKey) {
    try {
        await database.ref(`pending/${firebaseKey}`).remove();
        return true;
    } catch (error) {
        console.error('删除待审核数据失败:', error);
        return false;
    }
}

// 验证管理员权限
async function verifyAdmin(username, password) {
    try {
        // 从Firebase获取管理员列表
        const snapshot = await database.ref('admins').once('value');
        const admins = snapshot.val() || {};
        
        // 检查用户名和密码
        for (const [key, admin] of Object.entries(admins)) {
            if (admin.username === username && admin.password === password && admin.active) {
                return {
                    success: true,
                    user: {
                        id: key,
                        username: admin.username,
                        role: admin.role || 'admin'
                    }
                };
            }
        }
        
        return { success: false, error: '用户名或密码错误' };
    } catch (error) {
        console.error('验证管理员失败:', error);
        return { success: false, error: '验证失败，请检查网络连接' };
    }
}

// 检查当前用户权限
function checkAdminAuth() {
    const userData = localStorage.getItem('allianceAdminUser');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            window.allianceSystem.isAdmin = true;
            window.allianceSystem.currentUser = user;
            return true;
        } catch (error) {
            localStorage.removeItem('allianceAdminUser');
        }
    }
    return false;
}

// 退出登录
function logout() {
    localStorage.removeItem('allianceAdminUser');
    window.allianceSystem.isAdmin = false;
    window.allianceSystem.currentUser = null;
    window.location.href = 'index.html';
}

// 显示提示信息
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        // 如果页面没有toast元素，创建一个
        const toastEl = document.createElement('div');
        toastEl.id = 'toast';
        toastEl.className = 'toast';
        document.body.appendChild(toastEl);
    }
    
    const toastElement = document.getElementById('toast');
    toastElement.textContent = message;
    toastElement.className = `toast show ${type}`;
    setTimeout(() => {
        toastElement.classList.remove('show');
    }, 3000);
}

// 格式化数字
function formatNumber(num, decimals = 2) {
    return Number(num || 0).toFixed(decimals);
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

// 山头归类函数
function getMountainCategory(mountainName) {
    return mountainName.replace(/\d+$/, '');
}

// 获取山头类别列表
function getMountainCategories() {
    const categories = [...new Set(window.allianceSystem.allianceData.map(item => getMountainCategory(item.mountain)))];
    return categories.sort();
}

// 更新管理员状态显示
function updateAdminStatus() {
    const adminInfo = document.getElementById('adminInfo');
    const adminBtn = document.getElementById('adminBtn');
    
    if (!adminInfo || !adminBtn) return;
    
    if (window.allianceSystem.isAdmin && window.allianceSystem.currentUser) {
        adminInfo.textContent = `管理员: ${window.allianceSystem.currentUser.username}`;
        adminBtn.textContent = '退出登录';
        adminBtn.onclick = logout;
    } else {
        adminInfo.textContent = '未登录';
        adminBtn.textContent = '管理员登录';
        adminBtn.onclick = () => window.location.href = 'login.html';
    }
}

// 创建导航按钮 - 需要在 common.js 中更新这个函数
function createNavigation(currentPage = '') {
    const pages = [
        { name: 'index', title: '妖盟数据展示', url: 'index.html' },
        { name: 'rankings', title: '实力排行榜', url: 'rankings.html' },
        { name: 'add', title: '提交新数据', url: 'add.html' },
        { name: 'update', title: '更新已有数据', url: 'update.html' }
    ];
    
    if (window.allianceSystem.isAdmin) {
        pages.push({ name: 'admin', title: '数据审核', url: 'admin.html' });
        
        // 只有超级管理员才能看到管理员管理页面
        if (window.allianceSystem.currentUser?.role === 'superadmin') {
            pages.push({ name: 'admin-management', title: '管理员管理', url: 'admin-management.html' });
        }
    }
    
    const navContainer = document.getElementById('navButtons');
    if (!navContainer) return;
    
    navContainer.innerHTML = pages.map(page => {
        const activeClass = page.name === currentPage ? 'active' : '';
        const badge = page.name === 'admin' && window.allianceSystem.pendingData.length > 0 ? 
            `<span class="badge">${window.allianceSystem.pendingData.length}</span>` : '';
        
        return `
            <a href="${page.url}" class="nav-btn ${activeClass}">
                ${page.title}
                ${badge}
            </a>
        `;
    }).join('');
}

// 获取当前页面名称 - 也需要在 common.js 中更新这个函数
function getCurrentPageName() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1);
    
    if (page === 'index.html' || page === '') return 'index';
    if (page === 'rankings.html') return 'rankings';
    if (page === 'add.html') return 'add';
    if (page === 'update.html') return 'update';
    if (page === 'admin.html') return 'admin';
    if (page === 'admin-management.html') return 'admin-management';
    if (page === 'login.html') return 'login';
    
    return 'index';
}

// 检查页面访问权限
function checkPageAccess(requiredAuth = false) {
    const currentPage = getCurrentPageName();
    const isAdmin = window.allianceSystem.isAdmin;
    
    // 需要管理员权限的页面
    if (requiredAuth && !isAdmin) {
        showToast('需要管理员权限访问此页面', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
    
    // 已登录的管理员访问登录页面，直接跳转到管理页面
    if (currentPage === 'login' && isAdmin) {
        window.location.href = 'admin.html';
        return false;
    }
    
    return true;
}

// 初始化公共功能
function initCommon() {
    // 检查管理员权限
    checkAdminAuth();
    
    // 初始化连接监听
    initConnectionMonitoring();
    
    // 初始化数据监听
    initDataListeners();
    
    // 更新管理员状态
    updateAdminStatus();
    
    // 监听数据更新事件
    window.addEventListener('pendingDataUpdated', () => {
        updateAdminStatus();
        createNavigation(getCurrentPageName());
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initCommon();
    
    // 创建导航
    createNavigation(getCurrentPageName());
    
    // 创建toast元素
    if (!document.getElementById('toast')) {
        const toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
});

// 导出公共函数
window.AllianceUtils = {
    saveAllianceData,
    savePendingData,
    deleteAllianceData,
    deletePendingData,
    verifyAdmin,
    showToast,
    formatNumber,
    formatDate,
    getMountainCategory,
    getMountainCategories,
    updateAdminStatus,
    createNavigation,
    getCurrentPageName,
    checkPageAccess
};