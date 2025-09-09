// 管理员权限管理功能

// 全局变量
let adminsData = [];
let auditLogData = [];
let currentTab = 'admins';

// 初始化
function init() {
    bindEvents();
    loadAdminsData();
    loadAuditLog();
    loadStats();
}

// 检查超级管理员访问权限
function checkSuperAdminAccess() {
    if (!window.allianceSystem.isAdmin) {
        window.AllianceUtils.showToast('需要管理员权限', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return false;
    }

    if (!window.allianceSystem.currentUser || window.allianceSystem.currentUser.role !== 'superadmin') {
        window.AllianceUtils.showToast('需要超级管理员权限', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return false;
    }

    return true;
}

// 绑定事件
function bindEvents() {
    // 添加管理员表单
    const addForm = document.getElementById('addAdminForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddAdmin);
    }
}

// 切换管理标签页
function switchManagementTab(tabName) {
    currentTab = tabName;
    
    // 更新标签状态
    document.querySelectorAll('.management-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'audit') {
        loadAuditLog();
    }
}

// 加载管理员数据
async function loadAdminsData() {
    try {
        const snapshot = await firebase.database().ref('admins').once('value');
        const data = snapshot.val() || {};
        
        adminsData = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
        
        renderAdminsList();
        updateStats();
    } catch (error) {
        console.error('加载管理员数据失败:', error);
        document.getElementById('adminsList').innerHTML = '<div class="no-data">加载失败</div>';
    }
}

// 渲染管理员列表
function renderAdminsList() {
    const container = document.getElementById('adminsList');
    
    if (adminsData.length === 0) {
        container.innerHTML = '<div class="no-data">暂无管理员数据</div>';
        return;
    }
    
    const html = adminsData.map(admin => {
        const isSuperAdmin = admin.role === 'super';
        const isActive = admin.active !== false;
        const canEdit = admin.username !== window.allianceSystem.currentUser.username; // 不能编辑自己
        
        return `
            <div class="admin-card ${isSuperAdmin ? 'super-admin' : ''}">
                <div class="admin-header">
                    <div class="admin-info">
                        <span class="admin-username">${admin.username}</span>
                        <span class="admin-role ${isSuperAdmin ? 'role-super' : 'role-admin'}">
                            ${isSuperAdmin ? '超级管理员' : '普通管理员'}
                        </span>
                        <span class="admin-status ${isActive ? 'status-active' : 'status-inactive'}">
                            ${isActive ? '启用' : '禁用'}
                        </span>
                    </div>
                    ${canEdit ? `
                        <div class="admin-actions">
                            <button class="action-btn edit-btn" onclick="editAdmin('${admin.id}')">编辑</button>
                            <button class="action-btn toggle-btn" onclick="toggleAdminStatus('${admin.id}', ${!isActive})">
                                ${isActive ? '禁用' : '启用'}
                            </button>
                            ${!isSuperAdmin ? `<button class="action-btn delete-btn" onclick="deleteAdmin('${admin.id}')">删除</button>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="admin-details">
                    <p><strong>创建时间:</strong> ${admin.createdAt ? window.AllianceUtils.formatDate(admin.createdAt) : '未知'}</p>
                    <p><strong>最后登录:</strong> ${admin.lastLogin ? window.AllianceUtils.formatDate(admin.lastLogin) : '从未登录'}</p>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// 处理添加管理员
async function handleAddAdmin(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = '添加中...';
    
    try {
        const formData = new FormData(form);
        const username = formData.get('username').trim();
        const password = formData.get('password');
        const role = formData.get('role');
        const active = formData.get('active') === 'true';
        
        // 检查用户名是否已存在
        const existingAdmin = adminsData.find(admin => admin.username === username);
        if (existingAdmin) {
            window.AllianceUtils.showToast('用户名已存在', 'error');
            return;
        }
        
        // 创建管理员数据
        const adminData = {
            username: username,
            password: password,
            role: role,
            active: active,
            createdAt: new Date().toISOString(),
            createdBy: window.allianceSystem.currentUser.username
        };
        
        // 保存到Firebase
        await firebase.database().ref('admins').push(adminData);
        
        // 记录审核日志
        await logAuditAction('CREATE_ADMIN', {
            targetAdmin: username,
            role: role,
            active: active
        });
        
        window.AllianceUtils.showToast('管理员添加成功');
        form.reset();
        loadAdminsData();
        
    } catch (error) {
        console.error('添加管理员失败:', error);
        window.AllianceUtils.showToast('添加失败，请稍后重试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// 编辑管理员
function editAdmin(adminId) {
    const admin = adminsData.find(a => a.id === adminId);
    if (!admin) return;
    
    const newUsername = prompt('新用户名:', admin.username);
    if (!newUsername || newUsername === admin.username) return;
    
    // 检查用户名是否已存在
    const existingAdmin = adminsData.find(a => a.username === newUsername && a.id !== adminId);
    if (existingAdmin) {
        window.AllianceUtils.showToast('用户名已存在', 'error');
        return;
    }
    
    updateAdmin(adminId, { username: newUsername });
}

// 切换管理员状态
async function toggleAdminStatus(adminId, newStatus) {
    const admin = adminsData.find(a => a.id === adminId);
    if (!admin) return;
    
    const action = newStatus ? '启用' : '禁用';
    if (!confirm(`确认${action}管理员 "${admin.username}" 吗？`)) {
        return;
    }
    
    await updateAdmin(adminId, { active: newStatus });
    
    // 记录审核日志
    await logAuditAction(newStatus ? 'ENABLE_ADMIN' : 'DISABLE_ADMIN', {
        targetAdmin: admin.username
    });
}

// 删除管理员
async function deleteAdmin(adminId) {
    const admin = adminsData.find(a => a.id === adminId);
    if (!admin || admin.role === 'superadmin') return;
    
    if (!confirm(`确认删除管理员 "${admin.username}" 吗？此操作不可撤销。`)) {
        return;
    }
    
    try {
        await firebase.database().ref(`admins/${adminId}`).remove();
        
        // 记录审核日志
        await logAuditAction('DELETE_ADMIN', {
            targetAdmin: admin.username
        });
        
        window.AllianceUtils.showToast('管理员删除成功');
        loadAdminsData();
    } catch (error) {
        console.error('删除管理员失败:', error);
        window.AllianceUtils.showToast('删除失败，请稍后重试', 'error');
    }
}

// 更新管理员信息
async function updateAdmin(adminId, updates) {
    try {
        await firebase.database().ref(`admins/${adminId}`).update(updates);
        window.AllianceUtils.showToast('更新成功');
        loadAdminsData();
    } catch (error) {
        console.error('更新管理员失败:', error);
        window.AllianceUtils.showToast('更新失败，请稍后重试', 'error');
    }
}

// 加载审核记录
async function loadAuditLog() {
    try {
        const snapshot = await firebase.database().ref('audit_log').orderByChild('timestamp').limitToLast(50).once('value');
        const data = snapshot.val() || {};
        
        auditLogData = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        })).reverse(); // 最新的在前
        
        renderAuditLog();
    } catch (error) {
        console.error('加载审核记录失败:', error);
        document.getElementById('auditLog').innerHTML = '<div class="no-data">加载失败</div>';
    }
}

// 渲染审核记录
function renderAuditLog() {
    const container = document.getElementById('auditLog');
    
    if (auditLogData.length === 0) {
        container.innerHTML = '<div class="no-data">暂无审核记录</div>';
        return;
    }
    
    const html = auditLogData.map(log => {
        const actionText = getActionText(log.action);
        const actionClass = getActionClass(log.action);
        
        return `
            <div class="audit-log-item">
                <div class="audit-header">
                    <div>
                        <span class="audit-action ${actionClass}">${actionText}</span>
                        <strong>${log.adminUsername}</strong>
                        ${log.details ? `- ${formatAuditDetails(log.action, log.details)}` : ''}
                    </div>
                    <span class="audit-time">${window.AllianceUtils.formatDate(log.timestamp)}</span>
                </div>
                ${log.details && log.details.mountain && log.details.alliance ? `
                    <div class="audit-details">
                        山头: ${log.details.mountain} | 妖盟: ${log.details.alliance}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// 获取操作文本
function getActionText(action) {
    const actionMap = {
        'APPROVE_DATA': '通过申请',
        'REJECT_DATA': '拒绝申请',
        'CREATE_ADMIN': '创建管理员',
        'ENABLE_ADMIN': '启用管理员',
        'DISABLE_ADMIN': '禁用管理员',
        'DELETE_ADMIN': '删除管理员'
    };
    return actionMap[action] || action;
}

// 获取操作样式类
function getActionClass(action) {
    if (action.includes('APPROVE') || action.includes('CREATE') || action.includes('ENABLE')) {
        return 'action-approve';
    }
    if (action.includes('REJECT') || action.includes('DELETE') || action.includes('DISABLE')) {
        return 'action-reject';
    }
    return '';
}

// 格式化审核详情
function formatAuditDetails(action, details) {
    if (action.includes('ADMIN') && details.targetAdmin) {
        return `目标: ${details.targetAdmin}`;
    }
    if (details.mountain && details.alliance) {
        return `${details.mountain} - ${details.alliance}`;
    }
    return '';
}

// 记录审核日志
async function logAuditAction(action, details = {}) {
    try {
        const logData = {
            action: action,
            adminUsername: window.allianceSystem.currentUser.username,
            adminId: window.allianceSystem.currentUser.id,
            timestamp: new Date().toISOString(),
            details: details
        };
        
        await firebase.database().ref('audit_log').push(logData);
    } catch (error) {
        console.error('记录审核日志失败:', error);
    }
}

// 更新统计信息
function updateStats() {
    const totalAdmins = adminsData.length;
    const activeAdmins = adminsData.filter(admin => admin.active !== false).length;
    
    document.getElementById('totalAdmins').textContent = totalAdmins;
    document.getElementById('activeAdmins').textContent = activeAdmins;
    
    // 计算今日审核数
    const today = new Date().toDateString();
    const todayActions = auditLogData.filter(log => {
        const logDate = new Date(log.timestamp).toDateString();
        return logDate === today && (log.action === 'APPROVE_DATA' || log.action === 'REJECT_DATA');
    }).length;
    
    document.getElementById('todayActions').textContent = todayActions;
}

// 加载统计数据
async function loadStats() {
    updateStats();
}

// 导出全局事件处理函数
window.switchManagementTab = switchManagementTab;
window.editAdmin = editAdmin;
window.toggleAdminStatus = toggleAdminStatus;
window.deleteAdmin = deleteAdmin;

// 导出管理员管理功能
window.AdminManagement = {
    init,
    checkSuperAdminAccess,
    loadAdminsData,
    loadAuditLog,
    logAuditAction
};
