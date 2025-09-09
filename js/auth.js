// 认证相关功能 - 修复版本

// 处理登录表单提交
function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const username = formData.get('username').trim();
    const password = formData.get('password');
    
    if (!username || !password) {
        window.AllianceUtils.showToast('请输入用户名和密码', 'error');
        return;
    }
    
    const submitBtn = form.querySelector('.login-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '登录中...';
    
    // 验证管理员权限
    window.AllianceUtils.verifyAdmin(username, password)
        .then(async result => {
            if (result.success) {
                // 更新最后登录时间
                try {
                    await firebase.database().ref(`admins/${result.user.id}`).update({
                        lastLogin: new Date().toISOString()
                    });
                } catch (error) {
                    console.warn('更新登录时间失败:', error);
                }
                
                // 保存登录状态
                localStorage.setItem('allianceAdminUser', JSON.stringify(result.user));
                window.allianceSystem.isAdmin = true;
                window.allianceSystem.currentUser = result.user;
                
                console.log('Login successful, user role:', result.user.role);
                window.AllianceUtils.showToast('登录成功！');
                
                // 根据权限跳转到不同页面 - 修复：统一使用 'superadmin' 角色名称
                setTimeout(() => {
                    if (result.user.role === 'superadmin') {
                        console.log('Redirecting to admin management page...');
                        window.location.href = 'admin-management.html';
                    } else {
                        console.log('Redirecting to admin page...');
                        window.location.href = 'admin.html';
                    }
                }, 1000);
            } else {
                window.AllianceUtils.showToast(result.error || '登录失败', 'error');
            }
        })
        .catch(error => {
            console.error('登录错误:', error);
            window.AllianceUtils.showToast('登录失败，请稍后重试', 'error');
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
}

// 检查页面访问权限
function checkPageAccess(requiredAuth = false) {
    const currentPage = window.AllianceUtils.getCurrentPageName();
    const isAdmin = window.allianceSystem.isAdmin;
    
    // 需要管理员权限的页面
    if (requiredAuth && !isAdmin) {
        window.AllianceUtils.showToast('需要管理员权限访问此页面', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return false;
    }
    
    // 已登录的管理员访问登录页面，根据权限跳转 - 修复：统一使用 'superadmin' 角色名称
    if (currentPage === 'login' && isAdmin) {
        if (window.allianceSystem.currentUser?.role === 'superadmin') {
            window.location.href = 'admin-management.html';
        } else {
            window.location.href = 'admin.html';
        }
        return false;
    }
    
    return true;
}

// 初始化认证功能
function initAuth() {
    // 绑定登录表单事件
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 绑定取消按钮事件
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

// 导出功能
window.AllianceAuth = {
    handleLogin,
    checkPageAccess,
    initAuth
};