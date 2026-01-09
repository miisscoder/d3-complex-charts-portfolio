class TimeLineChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        
        // ==== 修改1: 调整左边距，避免重叠 ====
        this.margin = {
            top: 80, // 增加顶部边距为图例留空间
            bottom: 25,
            left: 180,  // 增加左边距，避免子Y轴标签重叠
            right: 120
        };
        
        // 颜色配置 - 包含所有服务类型，包括Missed Visit
        this.colors = {
            'Consultation': '#007FFF',
            'Treatment': '#8900FF',
            'Follow-up': '#4CAF50',
            'Screening': '#FF9800',
            'Therapy': '#9C27B0',
            'Missed Visit': '#E50000'  // 将missed作为一个服务类型
        };
        
        // 数据
        this.data = [];
        this.yData = {
            sites: ['Site A', 'Site B', 'Site C', 'Site D'],
            services: ['Consultation', 'Treatment', 'Follow-up', 'Screening', 'Therapy']  // 真实服务类型，不含Missed Visit
        };
        
        // 状态
        this.mode = 'month';
        this.selectedDate = new Date();
        this.selectedVisit = null;
        this.highlightedService = null;
        this.dragLineX = null; // 拖拽线的X位置
        
        // 尺寸相关
        this.yTextHeight = 16;
        this.barHeight = 6;
        this.marginHeightBetweenBar = 3;
        this.marginHeightUnderBars = 6;
        this.unitheight = 0;
        
        // 拖拽状态
        this.isDragging = false;
        this.dragLine = null;
        
        // 双击计时器
        this.doubleClickTimer = null;
        this.lastClickTime = 0;
        
        // 当前显示的日期范围
        this.currentTimePeriod = 0; // 0=当前，-1=上一个，1=下一个
        
        // 图例点击状态跟踪
        this.legendClickState = {
            'Consultation': 0, // 0=未点击，1=第一次点击，2=第二次点击
            'Treatment': 0,
            'Follow-up': 0,
            'Screening': 0,
            'Therapy': 0,
            'Missed Visit': 0
        };
        
        // 当前活动的图例项
        this.activeLegendItem = null;
        
        // 初始化
        this.init();
        this.generateSampleData();
        this.render();
    }
    
    init() {
        // 创建SVG容器
        this.svg = this.container
            .append('svg')
            .attr('width', '100%')
            .attr('height', 600)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // 创建单独的拖拽容器 - 使用相对定位
        this.dragContainer = this.container.select('svg')
            .append('g')
            .attr('class', 'drag-container')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 窗口resize处理
        window.addEventListener('resize', () => {
            setTimeout(() => this.handleResize(), 100);
        });
    }
    
    setupEventListeners() {
        // 视图模式切换
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.mode = e.target.dataset.mode;
                this.currentTimePeriod = 0; // 重置到当前时间
                this.update();
            });
        });
        
        // 导航按钮事件
        document.getElementById('prev-btn').addEventListener('click', () => {
            this.currentTimePeriod--;
            this.update();
        });
        
        document.getElementById('next-btn').addEventListener('click', () => {
            this.currentTimePeriod++;
            this.update();
        });
    }
    
    generateSampleData() {
        // 清空现有数据
        this.data = [];
        let visitCounter = 1000;
        
        // 根据当前模式和偏移计算日期范围
        const baseDate = new Date();
        let startDate, endDate;
        
        // 根据模式和偏移计算日期范围
        if (this.mode === 'year') {
            // 年模式：显示当前年、上一年、下一年
            const yearOffset = this.currentTimePeriod;
            startDate = new Date(baseDate.getFullYear() + yearOffset, 0, 1);
            endDate = new Date(baseDate.getFullYear() + yearOffset, 11, 31);
            
            // 为每个站点和服务生成数据
            this.yData.sites.forEach(site => {
                this.yData.services.forEach(service => {
                    // 年视图：每月1-3个数据点
                    for (let month = 0; month < 12; month++) {
                        const monthDataCount = 1 + Math.floor(Math.random() * 2); // 1-3个点
                        for (let i = 0; i < monthDataCount; i++) {
                            // 在当月内随机选择日期
                            const dayInMonth = 1 + Math.floor(Math.random() * 28); // 1-28号
                            const date = new Date(startDate.getFullYear(), month, dayInMonth);
                            
                            const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                            const status = Math.random() > 0.15 ? 'completed' : 'missed';
                            const value = Math.floor(Math.random() * 200) + 50; // 50-250
                            
                            this.data.push({
                                date: dateStr,
                                site: site,
                                service: service,
                                value: value,
                                visitID: `VISIT-${visitCounter++}`,
                                status: status
                            });
                        }
                    }
                });
            });
            
        } else if (this.mode === 'quarter') {
            // 季度模式：显示当前季度、上一个季度、下一个季度
            const currentQuarter = Math.floor(baseDate.getMonth() / 3);
            const quarterOffset = this.currentTimePeriod;
            const targetQuarter = (currentQuarter + quarterOffset) % 4;
            const targetYear = baseDate.getFullYear() + Math.floor((currentQuarter + quarterOffset) / 4);
            
            const quarterStartMonth = targetQuarter * 3;
            startDate = new Date(targetYear, quarterStartMonth, 1);
            endDate = new Date(targetYear, quarterStartMonth + 3, 0); // 季度的最后一天
            
            // 为每个站点和服务生成数据
            this.yData.sites.forEach(site => {
                this.yData.services.forEach(service => {
                    // 季度视图：每月3-5个数据点
                    for (let month = 0; month < 3; month++) {
                        const monthDataCount = 3 + Math.floor(Math.random() * 3); // 3-5个点
                        for (let i = 0; i < monthDataCount; i++) {
                            // 在当月内随机选择日期
                            const dayInMonth = 1 + Math.floor(Math.random() * 28); // 1-28号
                            const date = new Date(targetYear, quarterStartMonth + month, dayInMonth);
                            
                            const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                            const status = Math.random() > 0.15 ? 'completed' : 'missed';
                            const value = Math.floor(Math.random() * 100) + 30; // 30-130
                            
                            this.data.push({
                                date: dateStr,
                                site: site,
                                service: service,
                                value: value,
                                visitID: `VISIT-${visitCounter++}`,
                                status: status
                            });
                        }
                    }
                });
            });
            
        } else {
            // 月模式：显示当前月、上一个月、下一个月
            const monthOffset = this.currentTimePeriod;
            const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
            startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0); // 月份的最后一天
            
            // 为每个站点和服务生成数据
            this.yData.sites.forEach(site => {
                this.yData.services.forEach(service => {
                    // 月视图：5-8个数据点
                    const dataCount = 5 + Math.floor(Math.random() * 4); // 5-8个点
                    for (let i = 0; i < dataCount; i++) {
                        // 在当月内随机选择日期
                        const dayInMonth = 1 + Math.floor(Math.random() * 28); // 1-28号
                        const date = new Date(targetDate.getFullYear(), targetDate.getMonth(), dayInMonth);
                        
                        const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                        const status = Math.random() > 0.15 ? 'completed' : 'missed';
                        const value = Math.floor(Math.random() * 50) + 10; // 10-60
                        
                        this.data.push({
                            date: dateStr,
                            site: site,
                            service: service,
                            value: value,
                            visitID: `VISIT-${visitCounter++}`,
                            status: status
                        });
                    }
                });
            });
        }
        
        console.log(`Generated ${this.data.length} data points for ${this.mode} mode, period: ${this.currentTimePeriod}`);
        
        // 创建图例
        this.createLegend();
    }
    
    createLegend() {
        const container = this.container.node().parentNode;
        let legendContainer = document.querySelector('.chart-legend');
        
        if (!legendContainer) {
            legendContainer = document.createElement('div');
            legendContainer.className = 'chart-legend';
            container.appendChild(legendContainer);
        }
        
        // 构建图例HTML - 包含5个服务和Missed Visit
        let legendItemsHTML = '';
        
        // 添加5个真实服务
        this.yData.services.forEach(service => {
            legendItemsHTML += `
                <div class="legend-item" data-service="${service}">
                    <div class="legend-color" style="background-color: ${this.getServiceColor(service)}"></div>
                    <span class="legend-label">${service}</span>
                </div>
            `;
        });
        
        // 添加Missed Visit作为第6个图例项
        legendItemsHTML += `
            <div class="legend-item" data-service="Missed Visit">
                <div class="legend-color" style="background-color: ${this.colors['Missed Visit']}"></div>
                <span class="legend-label">Missed Visit</span>
            </div>
        `;
        
        legendContainer.innerHTML = `
            <div class="legend-header">
                <span>Services Legend</span>
            </div>
            <div class="legend-content">
                <div class="legend-items" id="chart-legend">
                    ${legendItemsHTML}
                </div>
            </div>
        `;
        
        // 添加所有图例项的点击事件
        const legendItems = legendContainer.querySelectorAll('.legend-item');
        legendItems.forEach(legendItem => {
            legendItem.addEventListener('click', (e) => {
                const service = e.currentTarget.dataset.service;
                this.handleLegendClick(service, legendItem);
            });
        });
    }
    
    handleLegendClick(service, legendItem) {
        // 获取当前点击状态
        const currentState = this.legendClickState[service];
        
        // 清除其他图例项的活动状态
        document.querySelectorAll('.legend-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 如果是同一个图例项再次点击
        if (this.activeLegendItem === service) {
            // 切换状态：奇数(1) -> 偶数(0) -> 奇数(1)...
            if (currentState % 2 === 0) {
                // 第一次或奇数次点击：高亮
                this.legendClickState[service] = 1;
                legendItem.classList.add('active');
                this.applyHighlight(service);
            } else {
                // 第二次或偶数次点击：恢复
                this.legendClickState[service] = 0;
                legendItem.classList.remove('active');
                this.resetHighlights();
            }
        } else {
            // 点击不同的图例项
            // 重置之前活动图例项的状态
            if (this.activeLegendItem) {
                this.legendClickState[this.activeLegendItem] = 0;
            }
            
            // 设置新图例项的状态
            this.activeLegendItem = service;
            this.legendClickState[service] = 1;
            legendItem.classList.add('active');
            this.applyHighlight(service);
        }
    }
    
    applyHighlight(service) {
        if (service === 'Missed Visit') {
            // 高亮显示missed visit（只显示missed状态的数据）
            this.svg.selectAll('.bar').each(function() {
                const bar = d3.select(this);
                const visitData = JSON.parse(bar.attr('data-visit'));
                
                if (visitData.status === 'missed') {
                    bar.classed('highlighted', true).classed('dimmed', false);
                } else {
                    bar.classed('highlighted', false).classed('dimmed', true);
                }
            });
        } else {
            // 高亮显示特定服务（只显示该服务的数据）
            this.svg.selectAll('.bar').each(function() {
                const bar = d3.select(this);
                const visitData = JSON.parse(bar.attr('data-visit'));
                
                // 只高亮匹配的服务，missed状态的数据也变暗
                if (visitData.service === service) {
                    bar.classed('highlighted', true).classed('dimmed', false);
                } else {
                    bar.classed('highlighted', false).classed('dimmed', true);
                }
            });
        }
    }
    
    transformToDate(dateStr) {
        const parts = dateStr.split('/');
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    
    formatDate(date) {
        if (this.mode === 'year') {
            // 年模式：显示年份和偏移信息
            const year = date.getFullYear();
            let suffix = '';
            if (this.currentTimePeriod === -1) suffix = ' (Previous Year)';
            else if (this.currentTimePeriod === 1) suffix = ' (Next Year)';
            else suffix = ' (Current Year)';
            return `Year ${year}${suffix}`;
        } else if (this.mode === 'quarter') {
            // 季度模式：显示季度和偏移信息
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            const year = date.getFullYear();
            let suffix = '';
            if (this.currentTimePeriod === -1) suffix = ' (Previous Quarter)';
            else if (this.currentTimePeriod === 1) suffix = ' (Next Quarter)';
            else suffix = ' (Current Quarter)';
            return `Q${quarter} ${year}${suffix}`;
        } else {
            // 月模式：显示月份和偏移信息
            const monthName = date.toLocaleDateString('en-US', { month: 'long' });
            const year = date.getFullYear();
            let suffix = '';
            if (this.currentTimePeriod === -1) suffix = ' (Previous Month)';
            else if (this.currentTimePeriod === 1) suffix = ' (Next Month)';
            else suffix = ' (Current Month)';
            return `${monthName} ${year}${suffix}`;
        }
    }
    
    getServiceColor(service) {
        // 返回服务的颜色，不包括Missed Visit
        return this.colors[service] || '#ccc';
    }
    
    updateTimeDisplay(date) {
        const displayText = this.formatDate(date);
        document.getElementById('current-time-display').textContent = displayText;
    }
    
    render() {
        // 计算单位高度
        this.unitheight = this.yTextHeight + 
                         (this.barHeight + this.marginHeightBetweenBar) * this.yData.services.length + 
                         this.marginHeightUnderBars;
        
        // 计算总高度
        const totalHeight = this.unitheight * this.yData.sites.length + 
                           this.margin.top + this.margin.bottom;
        
        // 计算宽度
        const containerWidth = Math.max(800, this.container.node().clientWidth);
        this.width = containerWidth - this.margin.left - this.margin.right;
        
        // 更新SVG尺寸
        this.container.select('svg')
            .attr('height', totalHeight)
            .attr('width', '100%');
        
        // 清空图表
        this.svg.selectAll('*').remove();
        this.dragContainer.selectAll('*').remove();
        
        // 创建比例尺
        this.createScales();
        
        // 添加背景区域
        this.addSiteBackgrounds();
        
        // 添加坐标轴
        this.addAxes();
        
        // 添加子Y轴刻度
        this.addSubYAxis();
        
        // 添加数据条
        this.addBars();
        
        // 添加可拖拽的时间线
        this.addDragLine();
        
        // 更新当前时间显示
        const now = new Date();
        if (this.mode === 'year') {
            // 根据偏移调整年份
            now.setFullYear(now.getFullYear() + this.currentTimePeriod);
        } else if (this.mode === 'quarter') {
            // 根据偏移调整季度
            const quarterOffset = this.currentTimePeriod;
            now.setMonth(now.getMonth() + quarterOffset * 3);
        } else {
            // 根据偏移调整月份
            now.setMonth(now.getMonth() + this.currentTimePeriod);
        }
        this.updateTimeDisplay(now);
        
        // 初始化时显示空白的详情表格
        this.showEmptyDetails();
        
        // 重置图例点击状态
        this.resetLegendStates();
    }
    
    createScales() {
        // 获取日期范围
        const dates = this.data.map(d => this.transformToDate(d.date));
        const minDate = d3.min(dates);
        const maxDate = d3.max(dates);
        
        // 扩展日期范围，确保X轴有足够的显示空间
        const extendedMinDate = new Date(minDate);
        const extendedMaxDate = new Date(maxDate);
        
        if (this.mode === 'year') {
            extendedMinDate.setDate(1); // 1号
            extendedMinDate.setMonth(0); // 1月
            extendedMaxDate.setDate(31); // 31号
            extendedMaxDate.setMonth(11); // 12月
            
            this.x = d3.scaleTime()
                .domain([extendedMinDate, extendedMaxDate])
                .range([0, this.width]);
                
        } else if (this.mode === 'quarter') {
            // 季度视图：按天显示
            extendedMinDate.setDate(1); // 从1号开始
            extendedMaxDate.setDate(1);
            extendedMaxDate.setMonth(extendedMaxDate.getMonth() + 1); // 下个月1号
            
            // 生成整个季度的所有天
            const dayRange = d3.timeDay.range(extendedMinDate, extendedMaxDate);
            
            // 显示每月1号、10号、20号
            this.displayDays = dayRange.filter(d => {
                const day = d.getDate();
                return day === 1 || day === 10 || day === 20;
            });
            
            this.x = d3.scaleBand()
                .domain(dayRange.map(d => d.toISOString()))
                .range([0, this.width])
                .padding(0.1);
                
        } else {
            // 月视图：按天显示
            extendedMinDate.setDate(1); // 从1号开始
            extendedMaxDate.setDate(1);
            extendedMaxDate.setMonth(extendedMaxDate.getMonth() + 1); // 下个月1号
            
            // 生成整个月的所有天
            const dayRange = d3.timeDay.range(extendedMinDate, extendedMaxDate);
            
            // 显示1号、5号、10号、15号、20号、25号
            this.displayDays = dayRange.filter(d => {
                const day = d.getDate();
                return day === 1 || day === 5 || day === 10 || day === 15 || day === 20 || day === 25;
            });
            
            // 确保至少有一些标签
            if (this.displayDays.length === 0) {
                this.displayDays = dayRange.filter((_, i) => i % 5 === 0);
                if (this.displayDays.length === 0) this.displayDays = dayRange;
            }
            
            this.x = d3.scaleBand()
                .domain(dayRange.map(d => d.toISOString()))
                .range([0, this.width])
                .padding(0.1);
        }
        
        // 创建Y轴比例尺（外层：站点）
        this.y = d3.scaleBand()
            .domain(this.yData.sites)
            .range([0, this.unitheight * this.yData.sites.length])
            .padding(0);
        
        // 创建服务比例尺（内层：服务类型）
        this.yUnit = d3.scaleBand()
            .domain(this.yData.services)
            .range([this.yTextHeight, this.yTextHeight + 
                   (this.barHeight + this.marginHeightBetweenBar) * this.yData.services.length])
            .padding(0.1);
    }
    
    addSiteBackgrounds() {
        // 为每个站点添加背景区域
        this.yData.sites.forEach((site, index) => {
            const yPosition = this.y(site);
            
            // 添加背景矩形
            this.svg.append('rect')
                .attr('class', 'site-group')
                .attr('x', 0)
                .attr('y', yPosition)
                .attr('width', this.width)
                .attr('height', this.y.bandwidth())
                .attr('rx', 4)
                .attr('ry', 4);
            
            // 添加站点标签 - 调整位置避免重叠
            this.svg.append('text')
                .attr('class', 'site-header')
                .attr('x', -this.margin.left + 20)  // 向右移动一点
                .attr('y', yPosition + this.y.bandwidth() / 2)
                .attr('dy', '0.32em')
                .text(site);
        });
    }
    
    addAxes() {
        // X轴
        if (this.mode === 'year') {
            // 年视图：按月显示，每个月份都显示
            const xAxis = d3.axisTop(this.x)
                .ticks(d3.timeMonth.every(1))
                .tickFormat(d3.timeFormat('%b'));
            
            this.svg.append('g')
                .attr('class', 'axis x-axis')
                .call(xAxis);
                
        } else if (this.mode === 'quarter') {
            // 季度视图：显示选定的日子，格式为"MMM DD"
            const xAxis = d3.axisTop(this.x)
                .tickValues(this.displayDays.map(d => d.toISOString()))
                .tickFormat(d => {
                    const date = new Date(d);
                    return d3.timeFormat('%b %d')(date);
                });
            
            this.svg.append('g')
                .attr('class', 'axis x-axis')
                .call(xAxis);
                
        } else {
            // 月视图：显示选定的日子，格式为"DD"
            const xAxis = d3.axisTop(this.x)
                .tickValues(this.displayDays.map(d => d.toISOString()))
                .tickFormat(d => {
                    const date = new Date(d);
                    return date.getDate();
                });
            
            this.svg.append('g')
                .attr('class', 'axis x-axis')
                .call(xAxis);
        }
    }
    
    addSubYAxis() {
        // 添加子Y轴刻度和标签 - 只显示真实服务，不显示Missed Visit
        this.yData.sites.forEach((site) => {
            const siteY = this.y(site);
            
            // 为每个服务添加标签
            this.yData.services.forEach((service) => {
                const serviceY = siteY + this.yUnit(service) + this.barHeight / 2;
                const serviceColor = this.getServiceColor(service);
                
                // 左侧标签 - 使用全拼英文
                // 增加左边距，避免与主Y轴标签重叠
                this.svg.append('text')
                    .attr('class', 'sub-axis-label')
                    .attr('x', -20)  // 调整位置
                    .attr('y', serviceY)
                    .attr('dy', '0.32em')
                    .attr('text-anchor', 'end')
                    .attr('fill', serviceColor)
                    .style('font-weight', '600')
                    .style('font-size', '10px')
                    .text(service);
            });
        });
    }
    
    addBars() {
        // 按站点分组数据
        const siteGroups = d3.group(this.data, d => d.site);
        
        // 遍历每个站点
        this.yData.sites.forEach(site => {
            const siteData = siteGroups.get(site) || [];
            const siteY = this.y(site);
            
            // 按日期分组
            const dateGroups = d3.group(siteData, d => d.date);
            
            // 遍历每个日期
            dateGroups.forEach((visits, dateStr) => {
                const date = this.transformToDate(dateStr);
                let xPos;
                
                if (this.mode === 'year') {
                    xPos = this.x(date);
                } else {
                    xPos = this.x(date.toISOString());
                }
                
                if (xPos === undefined) return;
                
                // 按服务类型分组
                const serviceGroups = d3.group(visits, d => d.service);
                
                // 遍历每个服务类型
                this.yData.services.forEach(service => {
                    const serviceVisits = serviceGroups.get(service) || [];
                    
                    serviceVisits.forEach(visit => {
                        const serviceY = siteY + this.yUnit(service);
                        // 根据状态确定颜色：如果是missed则使用Missed Visit颜色，否则使用服务颜色
                        const barColor = visit.status === 'missed' ? 
                            this.colors['Missed Visit'] : this.getServiceColor(service);
                        
                        // 计算条宽度
                        const barWidth = this.mode === 'year' ? 6 : this.x.bandwidth();
                        
                        // 添加数据条
                        const bar = this.svg.append('rect')
                            .attr('class', 'bar')
                            .attr('x', this.mode === 'year' ? xPos - barWidth/2 : xPos)
                            .attr('y', serviceY)
                            .attr('width', barWidth)
                            .attr('height', this.barHeight)
                            .attr('rx', this.barHeight / 2)
                            .attr('ry', this.barHeight / 2)
                            .attr('fill', barColor)
                            .attr('stroke', barColor)
                            .attr('stroke-width', 1)
                            .attr('data-visit', JSON.stringify(visit));
                        
                        // 添加点击事件
                        bar.on('click', (event) => {
                            event.stopPropagation();
                            const visitData = JSON.parse(event.target.getAttribute('data-visit'));
                            this.selectVisit(visitData, barColor);
                        });
                    });
                });
            });
        });
    }
    
    addDragLine() {
        // 清理现有拖拽线
        this.svg.selectAll('.drag-line').remove();
        
        // 计算初始位置（中间或保存的位置）
        const startX = 0;
        const endX = this.width;
        const initialX = this.dragLineX || (startX + (endX - startX) / 2);
        
        // 创建拖拽线组
        this.dragLine = this.svg.append('g')
            .attr('class', 'drag-line')
            .attr('transform', `translate(${initialX}, 0)`);
        
        // 垂直线
        this.dragLine.append('line')
            .attr('y1', 0)
            .attr('y2', this.y.range()[1])
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');
        
        // 创建拖拽函数 - 使用相对于SVG的坐标
        const drag = d3.drag()
            .on('start', (event) => {
                this.isDragging = true;
                this.dragLine.selectAll('circle')
                    .classed('dragging', true);
                
                // 保存初始SVG坐标
                const [startXInSvg] = d3.pointer(event, this.svg.node());
                this.dragStartXInSvg = startXInSvg;
                
                // 获取当前拖拽线的实际X位置，而不是使用initialX
                const currentTransform = this.dragLine.attr('transform');
                const match = currentTransform.match(/translate\(([^,]+)/);
                const currentX = match ? parseFloat(match[1]) : initialX;
                this.dragStartTransformX = currentX;
            })
            .on('drag', (event) => {
                if (!this.isDragging) return;
                
                // 获取相对于SVG的当前坐标
                const [currentXInSvg] = d3.pointer(event, this.svg.node());
                
                // 计算位移
                const deltaX = currentXInSvg - this.dragStartXInSvg;
                
                // 计算新位置
                const newX = Math.max(startX, Math.min(endX, this.dragStartTransformX + deltaX));
                
                // 更新位置
                this.dragLine.attr('transform', `translate(${newX}, 0)`);
                this.dragLineX = newX;
                
                // 根据位置找到对应的日期
                let newDate;
                if (this.mode === 'year') {
                    newDate = this.x.invert(newX);
                } else {
                    const domain = this.x.domain();
                    const bandwidth = this.x.bandwidth();
                    const index = Math.floor(newX / bandwidth);
                    if (domain[index]) {
                        newDate = new Date(domain[index]);
                    }
                }
                
                if (newDate) {
                    this.selectedDate = newDate;
                    this.updateTimeDisplay(newDate);
                }
            })
            .on('end', (event) => {
                this.isDragging = false;
                this.dragLine.selectAll('circle')
                    .classed('dragging', false);
            });
        
        // 顶部手柄
        this.dragLine.append('circle')
            .attr('class', 'drag-handle')
            .attr('cy', 0)
            .attr('r', 8)
            .call(drag);
        
        // 底部手柄
        this.dragLine.append('circle')
            .attr('class', 'drag-handle')
            .attr('cy', this.y.range()[1])
            .attr('r', 8)
            .call(drag);
    }

    selectVisit(visit, barColor) {
        this.selectedVisit = visit;
        
        // 显示详细信息
        this.showSimpleDetails(visit, barColor);
        
        // 高亮选中的数据条 - 移除红色光圈，使用高亮效果
        this.svg.selectAll('.bar')
            .classed('selected', false);
        
        // 高亮匹配的条形 - 使用半透明外发光效果
        this.svg.selectAll('.bar')
            .filter(function() {
                const barData = JSON.parse(this.getAttribute('data-visit'));
                return barData.visitID === visit.visitID;
            })
            .classed('selected', true);
    }
    
    showEmptyDetails() {
        // 显示空的详情表格，颜色为黑色
        const borderColor = '#333';
        const textColor = '#333';
        const bgColor = '#f8f9fa';
        
        const detailsHTML = `
            <div class="simple-details" style="border-color: ${borderColor}">
                <div class="details-grid">
                    <div class="detail-item" style="border-color: ${borderColor}">
                        <div class="detail-label">X-Axis (Date):</div>
                        <div class="detail-value" style="color: ${textColor}; background: ${bgColor}">
                            -
                        </div>
                    </div>
                    <div class="detail-item" style="border-color: ${borderColor}">
                        <div class="detail-label">Y-Axis (Site):</div>
                        <div class="detail-value" style="color: ${textColor}; background: ${bgColor}">
                            -
                        </div>
                    </div>
                    <div class="detail-item" style="border-color: ${borderColor}">
                        <div class="detail-label">Sub Y-Axis (Service):</div>
                        <div class="detail-value" style="color: ${textColor}; background: ${bgColor}">
                            -
                        </div>
                    </div>
                    <div class="detail-item" style="border-color: ${borderColor}">
                        <div class="detail-label">Visit ID:</div>
                        <div class="detail-value" style="color: ${textColor}; background: ${bgColor}">
                            -
                        </div>
                    </div>
                    <div class="detail-item" style="border-color: ${borderColor}">
                        <div class="detail-label">Value:</div>
                        <div class="detail-value" style="color: ${textColor}; background: ${bgColor}">
                            -
                        </div>
                    </div>
                    <div class="detail-item" style="border-color: ${borderColor}">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value" style="color: ${textColor}; background: ${bgColor}">
                            -
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('data-details').innerHTML = detailsHTML;
        document.getElementById('data-details').classList.add('active');
    }
    
    showSimpleDetails(visit, barColor) {
        const originalServiceColor = this.getServiceColor(visit.service);
        const isMissed = visit.status === 'missed';
        
        // ==== 修改3: 如果是missed，在类别后面加 (Missed Visit) ====
        const serviceDisplay = isMissed ? 
            `${visit.service} <span style="color: #E50000">(Missed Visit)</span>` : 
            visit.service;
        
        const detailsHTML = `
            <div class="simple-details" style="border-color: ${barColor}">
                <div class="details-grid">
                    <div class="detail-item" style="border-color: ${barColor}">
                        <div class="detail-label">X-Axis (Date):</div>
                        <div class="detail-value" style="color: ${barColor}; background: ${this.addAlpha(barColor, 0.1)}">
                            ${visit.date}
                        </div>
                    </div>
                    <div class="detail-item" style="border-color: ${barColor}">
                        <div class="detail-label">Y-Axis (Site):</div>
                        <div class="detail-value" style="color: ${barColor}; background: ${this.addAlpha(barColor, 0.1)}">
                            ${visit.site}
                        </div>
                    </div>
                    <div class="detail-item" style="border-color: ${originalServiceColor}">
                        <div class="detail-label">Sub Y-Axis (Service):</div>
                        <div class="detail-value" style="color: ${originalServiceColor}; background: ${this.addAlpha(originalServiceColor, 0.1)}">
                            ${serviceDisplay}
                        </div>
                    </div>
                    <div class="detail-item" style="border-color: ${barColor}">
                        <div class="detail-label">Visit ID:</div>
                        <div class="detail-value" style="color: ${barColor}; background: ${this.addAlpha(barColor, 0.1)}">
                            ${visit.visitID}
                        </div>
                    </div>
                    <div class="detail-item" style="border-color: ${barColor}">
                        <div class="detail-label">Value:</div>
                        <div class="detail-value" style="color: ${barColor}; background: ${this.addAlpha(barColor, 0.1)}">
                            ${visit.value}
                        </div>
                    </div>
                    <div class="detail-item" style="border-color: ${isMissed ? this.colors['Missed Visit'] : originalServiceColor}">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value" style="color: ${isMissed ? this.colors['Missed Visit'] : originalServiceColor}; background: ${this.addAlpha(isMissed ? this.colors['Missed Visit'] : originalServiceColor, 0.1)}">
                            ${isMissed ? 
                                '<span style="color: #E50000; font-weight: bold;">✗ MISSED</span>' : 
                                '<span style="color: #4CAF50; font-weight: bold;">✓ Completed</span>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('data-details').innerHTML = detailsHTML;
        document.getElementById('data-details').classList.add('active');
    }
    
    addAlpha(color, alpha) {
        // 为颜色添加透明度
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return color;
    }
    
    resetHighlights() {
        // 重置所有条形的透明度
        this.svg.selectAll('.bar')
            .classed('highlighted', false)
            .classed('dimmed', false);
    }
    
    resetLegendStates() {
        // 重置所有图例点击状态
        Object.keys(this.legendClickState).forEach(key => {
            this.legendClickState[key] = 0;
        });
        this.activeLegendItem = null;
        
        // 清除所有图例项的活动状态
        document.querySelectorAll('.legend-item').forEach(item => {
            item.classList.remove('active');
        });
    }
    
    update() {
        // 重新生成数据（根据新模式和当前偏移）
        this.generateSampleData();
        this.render();
    }
    
    handleResize() {
        // 重新计算宽度并更新
        this.render();
    }
}

// 初始化图表
document.addEventListener('DOMContentLoaded', () => {
    window.timeLineChart = new TimeLineChart('timeline-chart');
});