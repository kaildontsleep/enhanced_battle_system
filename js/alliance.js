// 妖盟展示相关功能 - 更新版本

// 更新山头筛选器
function updateMountainFilters() {
    const categories = window.AllianceUtils.getMountainCategories();
    const select = document.getElementById('mountainFilter');
    
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="all">全部山头</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
    
    if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
    }
}

// 筛选数据
function filterData() {
    const selectedMountain = document.getElementById('mountainFilter')?.value || 'all';
    const selectedType = document.getElementById('typeFilter')?.value || 'all';
    
    renderData(selectedMountain, selectedType);
}

// 更新统计信息
function updateStats(filteredData) {
    const statsContainer = document.getElementById('statsRow');
    if (!statsContainer) return;
    
    const totalCount = filteredData.length;
    const greenCount = filteredData.filter(item => item.relation === 'green').length;
    const orangeCount = filteredData.filter(item => item.relation === 'orange').length;
    const blueCount = filteredData.filter(item => item.relation === 'blue').length;
    
    const totalPower = filteredData.reduce((sum, item) => sum + (item.totalPower || 0), 0);
    
    let html = `
        <div class="stat-item">
            <span class="icon">📊</span>
            <span class="label">总数：</span>
            <span class="value">${totalCount}个妖盟</span>
        </div>
        <div class="stat-item">
            <span class="icon">⚡</span>
            <span class="label">总战力：</span>
            <span class="value">${window.AllianceUtils.formatNumber(totalPower)}万亿</span>
        </div>
    `;
    
    if (greenCount > 0) {
        html += `
            <div class="stat-item green">
                <span class="icon">🤝</span>
                <span class="label">联盟：</span>
                <span class="value">${greenCount}个</span>
            </div>
        `;
    }
    
    if (orangeCount > 0) {
        html += `
            <div class="stat-item orange">
                <span class="icon">⚔️</span>
                <span class="label">敌对：</span>
                <span class="value">${orangeCount}个</span>
            </div>
        `;
    }
    
    if (blueCount > 0) {
        html += `
            <div class="stat-item blue">
                <span class="icon">🕊️</span>
                <span class="label">合作：</span>
                <span class="value">${blueCount}个</span>
            </div>
        `;
    }
    
    statsContainer.innerHTML = html;
}

// 渲染数据 - 添加了更新时间显示
function renderData(filterMountain = 'all', filterType = 'all') {
    const container = document.getElementById('dataDisplay');
    if (!container) return;
    
    let filteredData = [...window.allianceSystem.allianceData];
    
    if (filterMountain !== 'all') {
        filteredData = filteredData.filter(item => 
            window.AllianceUtils.getMountainCategory(item.mountain) === filterMountain
        );
    }
    
    if (filterType !== 'all') {
        filteredData = filteredData.filter(item => item.relation === filterType);
    }
    
    updateStats(filteredData);
    
    const groupedData = {};
    filteredData.forEach(item => {
        if (!groupedData[item.mountain]) {
            groupedData[item.mountain] = [];
        }
        groupedData[item.mountain].push(item);
    });
    
    if (Object.keys(groupedData).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>暂无数据</h3>
                <p>请点击"提交新数据"添加妖盟信息</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    Object.keys(groupedData).sort().forEach(mountain => {
        html += `
            <div class="mountain-section">
                <div class="section-header">
                    <h2>🏔 ${mountain}</h2>
                    <span class="count">${groupedData[mountain].length}个妖盟</span>
                </div>
                <div class="alliance-grid">
        `;
        
        groupedData[mountain].forEach(alliance => {
            const typeClass = `type-${alliance.relation}`;
            const relationText = alliance.relation === 'green' ? '联盟' : 
                                alliance.relation === 'orange' ? '敌对' : '合作';
            
            // 格式化更新时间
            const updateTimeText = alliance.lastUpdated ? 
                window.AllianceUtils.formatDate(alliance.lastUpdated) : '未知';
            
            html += `
                <div class="alliance-card ${typeClass}">
                    <button class="edit-btn" onclick="editAlliance('${mountain}', '${alliance.alliance}')">✏️</button>
                    <div class="alliance-name">🏛️ ${relationText} ${alliance.alliance}</div>
                    <div class="alliance-total">总战力: ${window.AllianceUtils.formatNumber(alliance.totalPower)}万亿</div>
                    <div class="alliance-update-time">最后更新: ${updateTimeText}</div>
                    <div class="member-list">
            `;
            
            if (alliance.members && alliance.members.length > 0) {
                alliance.members.forEach(member => {
                    html += `
                        <div class="member-item">
                            <span class="member-name">👤 ${member.name}</span>
                            <span class="member-power">${window.AllianceUtils.formatNumber(member.power)}万亿</span>
                        </div>
                    `;
                });
            } else {
                html += `<div style="color: #999; font-size: 13px;">暂无车头信息</div>`;
            }
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 编辑妖盟 - 改进版本，增加调试和验证
function editAlliance(mountain, alliance) {
    console.log('editAlliance called with:', { mountain, alliance });
    
    // 验证参数
    if (!mountain || !alliance) {
        console.error('editAlliance: 缺少必要参数', { mountain, alliance });
        window.AllianceUtils.showToast('参数错误，无法编辑', 'error');
        return;
    }
    
    // 验证数据是否存在
    const exists = window.allianceSystem.allianceData.find(item => 
        item.mountain === mountain && item.alliance === alliance
    );
    
    if (!exists) {
        console.error('editAlliance: 未找到指定的妖盟数据', { mountain, alliance });
        console.log('当前可用数据:', window.allianceSystem.allianceData);
        window.AllianceUtils.showToast('未找到指定的妖盟数据', 'error');
        return;
    }
    
    console.log('找到数据，准备跳转到编辑页面:', exists);
    
    // 跳转到更新页面并传递参数
    const url = new URL('update.html', window.location.origin);
    url.searchParams.set('mountain', mountain);
    url.searchParams.set('alliance', alliance);
    
    console.log('跳转URL:', url.toString());
    window.location.href = url.toString();
}

// 导出功能
window.AllianceDisplay = {
    updateMountainFilters,
    filterData,
    updateStats,
    renderData,
    editAlliance
};