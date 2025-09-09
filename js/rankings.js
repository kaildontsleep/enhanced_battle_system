// 排行榜功能模块 - 简化版本

// 全局变量
let currentTab = 'alliance';
let currentFilter = 'all';
let allianceRankingData = [];
let playerRankingData = [];

// 加载排行榜数据
function loadRankingData() {
    try {
        // 检查数据是否可用
        if (!window.allianceSystem || !window.allianceSystem.allianceData) {
            console.log('Alliance system data not available yet, retrying in 2 seconds...');
            setTimeout(loadRankingData, 2000);
            return;
        }

        const rawData = window.allianceSystem.allianceData;
        console.log('Loading ranking data, found', rawData.length, 'alliances');

        // 从全局数据中提取妖盟排行榜数据
        allianceRankingData = rawData.map(item => ({
            mountain: item.mountain,
            alliance: item.alliance,
            relation: item.relation,
            totalPower: item.totalPower || 0,
            members: item.members || [],
            lastUpdated: item.lastUpdated || ''
        }));

        // 按战力降序排序
        allianceRankingData.sort((a, b) => (b.totalPower || 0) - (a.totalPower || 0));

        // 从妖盟数据中提取车头排行榜数据
        playerRankingData = [];
        rawData.forEach(alliance => {
            if (alliance.members && alliance.members.length > 0) {
                alliance.members.forEach(member => {
                    if (member.name && member.power) {
                        playerRankingData.push({
                            mountain: alliance.mountain,
                            alliance: alliance.alliance,
                            relation: alliance.relation,
                            playerName: member.name,
                            power: member.power || 0
                        });
                    }
                });
            }
        });

        // 按车头战力降序排序
        playerRankingData.sort((a, b) => (b.power || 0) - (a.power || 0));

        // 更新统计信息和渲染
        updateStats();
        renderRanking();

        console.log('排行榜数据加载完成:', {
            alliances: allianceRankingData.length,
            players: playerRankingData.length
        });
    } catch (error) {
        console.error('加载排行榜数据失败:', error);
        const container = document.getElementById('rankingContent');
        if (container) {
            container.innerHTML = '<div class="no-data">加载失败: ' + error.message + '</div>';
        }
        
        // 5秒后重试
        setTimeout(() => {
            console.log('Retrying to load ranking data...');
            loadRankingData();
        }, 5000);
    }
}

// 更新统计信息
function updateStats() {
    const totalAlliances = allianceRankingData.length;
    const totalPlayers = playerRankingData.length;
    
    const totalAlliancesEl = document.getElementById('totalAlliances');
    const totalPlayersEl = document.getElementById('totalPlayers');
    const currentFilterEl = document.getElementById('currentFilter');
    const lastUpdateEl = document.getElementById('lastUpdateTime');
    
    if (totalAlliancesEl) totalAlliancesEl.textContent = totalAlliances;
    if (totalPlayersEl) totalPlayersEl.textContent = totalPlayers;
    
    // 更新当前筛选显示
    const filterNames = {
        'all': '全部',
        'green': '联盟',
        'orange': '敌对',
        'blue': '中立'
    };
    if (currentFilterEl) {
        currentFilterEl.textContent = filterNames[currentFilter] || '全部';
    }
    
    // 更新时间显示
    if (lastUpdateEl) {
        const now = new Date();
        lastUpdateEl.textContent = `最后更新：${now.toLocaleString('zh-CN')}`;
    }
}

// 设置筛选条件
function setFilter(filter) {
    currentFilter = filter;
    
    // 更新按钮状态
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 找到并激活当前按钮
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes(`'${filter}'`)) {
            btn.classList.add('active');
        }
    });
    
    // 更新统计信息和重新渲染
    updateStats();
    renderRanking();
}

// 切换标签页
function switchTab(tab) {
    currentTab = tab;
    
    // 更新标签状态
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 找到并激活当前标签
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tabBtn => {
        const onclick = tabBtn.getAttribute('onclick');
        if (onclick && onclick.includes(`'${tab}'`)) {
            tabBtn.classList.add('active');
        }
    });
    
    // 更新标题
    const titleEl = document.getElementById('rankingTitle');
    const subtitleEl = document.getElementById('rankingSubtitle');
    
    if (tab === 'alliance') {
        if (titleEl) titleEl.textContent = '妖盟总战力排行榜';
        if (subtitleEl) subtitleEl.textContent = '根据最新审核数据排名';
    } else {
        if (titleEl) titleEl.textContent = '妖盟车头战力排行榜';
        if (subtitleEl) subtitleEl.textContent = '根据最新车头战力排名';
    }
    
    // 重新渲染
    renderRanking();
}

// 渲染排行榜
function renderRanking() {
    const container = document.getElementById('rankingContent');
    if (!container) return;
    
    try {
        if (currentTab === 'alliance') {
            renderAllianceRanking(container);
        } else {
            renderPlayerRanking(container);
        }
    } catch (error) {
        console.error('渲染排行榜失败:', error);
        container.innerHTML = '<div class="no-data">渲染失败: ' + error.message + '</div>';
    }
}

// 渲染妖盟排行榜
function renderAllianceRanking(container) {
    let data = filterAllianceData(allianceRankingData);
    
    console.log('Rendering alliance ranking, filtered data length:', data.length);
    
    // 清除loading类
    container.className = container.className.replace('loading', '').trim();
    
    if (data.length === 0) {
        container.innerHTML = '<div class="no-data">暂无符合条件的妖盟数据</div>';
        return;
    }

    const html = data.slice(0, 100).map((item, index) => {  // 限制显示前100名，避免性能问题
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const badgeClass = rank <= 3 ? 'top3' : (rank <= 10 ? 'top10' : 'normal');
        
        // 获取妖盟类型显示文本和样式
        const relationText = getRelationText(item.relation);
        const relationClass = getRelationClass(item.relation);
        
        return `
            <div class="ranking-item">
                <div class="rank ${rankClass}">
                    <span class="rank-badge ${badgeClass}">${rank}</span>
                </div>
                <div class="info">
                    <div class="mountain-name">${item.mountain || '未知山头'}</div>
                    <div class="alliance-name">${item.alliance || '未知妖盟'}</div>
                    <div class="alliance-type ${relationClass}">${relationText}</div>
                    <div class="power">${formatNumber(item.totalPower)}万亿</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="ranking-list">${html}</div>`;
    console.log('Alliance ranking rendered successfully');
}

// 渲染车头排行榜
function renderPlayerRanking(container) {
    let data = filterPlayerData(playerRankingData);
    
    console.log('Rendering player ranking, filtered data length:', data.length);
    
    // 清除loading类
    container.className = container.className.replace('loading', '').trim();
    
    if (data.length === 0) {
        container.innerHTML = '<div class="no-data">暂无符合条件的车头数据</div>';
        return;
    }

    const html = data.slice(0, 100).map((item, index) => {  // 限制显示前100名
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const badgeClass = rank <= 3 ? 'top3' : (rank <= 10 ? 'top10' : 'normal');
        
        return `
            <div class="ranking-item">
                <div class="rank ${rankClass}">
                    <span class="rank-badge ${badgeClass}">${rank}</span>
                </div>
                <div class="info player-info">
                    <div class="mountain-name">${item.mountain || '未知山头'}</div>
                    <div class="alliance-name">${item.alliance || '未知妖盟'}</div>
                    <div class="player-name">${item.playerName || '未知车头'}</div>
                    <div class="power">${formatNumber(item.power)}万亿</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="ranking-list">${html}</div>`;
    console.log('Player ranking rendered successfully');
}

// 筛选妖盟数据
function filterAllianceData(data) {
    if (currentFilter === 'all') {
        return data;
    }
    
    return data.filter(item => item.relation === currentFilter);
}

// 筛选车头数据
function filterPlayerData(data) {
    if (currentFilter === 'all') {
        return data;
    }
    
    return data.filter(item => item.relation === currentFilter);
}

// 获取关系类型显示文本
function getRelationText(relation) {
    const relationMap = {
        'green': '联盟',
        'orange': '敌对',
        'blue': '中立'
    };
    return relationMap[relation] || '未知';
}

// 获取关系类型样式类名
function getRelationClass(relation) {
    const classMap = {
        'green': 'type-green',
        'orange': 'type-orange',
        'blue': 'type-blue'
    };
    return classMap[relation] || 'type-blue';
}

// 格式化数字
function formatNumber(num, decimals = 2) {
    if (window.AllianceUtils && window.AllianceUtils.formatNumber) {
        return window.AllianceUtils.formatNumber(num, decimals);
    }
    return Number(num || 0).toFixed(decimals);
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
    // 绑定全局事件处理函数
    window.setFilter = setFilter;
    window.switchTab = switchTab;
    
    // 导出排行榜功能模块
    window.AllianceRankings = {
        loadRankingData,
        updateStats,
        setFilter,
        switchTab,
        renderRanking,
        renderAllianceRanking,
        renderPlayerRanking,
        filterAllianceData,
        filterPlayerData,
        getRelationText,
        getRelationClass
    };
}