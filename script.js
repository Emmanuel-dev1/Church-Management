// Church Management System - Enhanced JavaScript Implementation
class ChurchManagementSystem {
    constructor() {
        this.churches = JSON.parse(localStorage.getItem('churches')) || {};
        this.charts = {};
        this.users = JSON.parse(localStorage.getItem('users')) || {};
        this.init();
    }

    // Register a new church
    registerChurch(churchName, churchInitials) {
        if (!churchName || !churchInitials) return;
        
        // Validate church initials
        if (!this.validateInitials(churchInitials)) {
            this.showNotification('Church initials must be 2-4 letters!', 'error');
            return;
        }

        // Check if church already exists
        if (this.churches[churchName]) {
            this.showNotification('Church already exists!', 'error');
            return;
        }

        // Add new church with all required properties
        this.churches[churchName] = {
            name: churchName,
            initials: churchInitials.toUpperCase(),
            members: {},
            tithes: [],
            expenses: [] // Initialize expenses array
        };

        // Save to localStorage
        this.saveData();
        
        // Update UI
        this.updateChurchSelectors();
        this.displayChurches();
        this.showNotification('Church registered successfully!', 'success');
    }

    // View all tithes for a church
    viewChurchTithes(churchName) {
        if (!churchName) {
            document.getElementById('viewTitheMember').innerHTML = '<option value="">All Members</option>';
            document.getElementById('tithesList').innerHTML = '<p>Please select a church.</p>';
            return;
        }

        const church = this.churches[churchName];
        if (!church) return;

        // Update member selector
        const memberSelect = document.getElementById('viewTitheMember');
        memberSelect.innerHTML = '<option value="">All Members</option>';
        
        if (church.members) {
            Object.values(church.members)
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(member => {
                    memberSelect.innerHTML += `<option value="${member.id}">${member.title} ${member.name}</option>`;
                });
        }

        // Display all tithes for the church
        this.displayTithes(churchName);
    }

    // Display tithes with optional member filter
    displayTithes(churchName, searchTerm = '', memberId = '') {
        const church = this.churches[churchName];
        if (!church) return;

        let tithes = church.tithes || [];
        
        // Filter by member if specified
        if (memberId) {
            tithes = tithes.filter(tithe => tithe.memberId === memberId);
        }

        // Filter by search term if provided
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            tithes = tithes.filter(tithe => {
                const member = church.members[tithe.memberId];
                return member && (
                    member.name.toLowerCase().includes(searchLower) ||
                    member.title.toLowerCase().includes(searchLower)
                );
            });
        }

        // Sort tithes by date (most recent first)
        tithes.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Calculate summary statistics
        const totalAmount = tithes.reduce((sum, t) => sum + t.amount, 0);
        const typeStats = tithes.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + t.amount;
            return acc;
        }, {});

        // Update summary display
        document.getElementById('titheTotalAmount').innerHTML = `
            Total Contributions: ${this.formatEuro(totalAmount)}
        `;

        document.getElementById('titheStats').innerHTML = Object.entries(typeStats)
            .map(([type, amount]) => `
                <div class="stat-item">
                    ${type.charAt(0).toUpperCase() + type.slice(1)}: ${this.formatEuro(amount)}
                </div>
            `).join('');

        // Display tithe records
        const container = document.getElementById('tithesList');
        
        if (tithes.length === 0) {
            container.innerHTML = '<p>No tithe records found.</p>';
            return;
        }

        container.innerHTML = tithes.map(tithe => {
            const member = church.members[tithe.memberId];
            if (!member) return ''; // Skip if member not found
            
            return `
                <div class="list-item tithe-item">
                    <div class="member-info">
                        <p>
                            <strong>${member.title} ${member.name}</strong>
                            <span class="member-id">${member.id}</span>
                            <span class="tithe-type">${tithe.type}</span>
                        </p>
                        <p>Date: ${new Date(tithe.date).toLocaleDateString()}</p>
                        <p class="tithe-amount">${this.formatEuro(tithe.amount)}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Register new user
    registerUser(username, password, email) {
        if (this.users[username]) {
            throw new Error('Username already exists');
        }
        this.users[username] = {
            password: password,
            email: email,
            dateRegistered: new Date().toISOString()
        };
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    // Check login credentials
    checkLogin(username, password) {
        return this.users[username] && this.users[username].password === password;
    }

    init() {
        this.updateChurchSelectors();
        this.displayChurches();
        this.initializeCharts();
        this.initializeExpenseCharts();
        this.updateExpenseSelectors(); // Add this line
    }

    // Add new method for updating expense selectors
    updateExpenseSelectors() {
        const expenseSelectors = ['expenseChurch', 'overviewChurch', 'viewExpenseChurch'];
        const churches = Object.keys(this.churches);

        expenseSelectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                const currentValue = selector.value;
                selector.innerHTML = '<option value="">Select Church</option>';
                churches.forEach(churchName => {
                    selector.innerHTML += `<option value="${churchName}">${churchName}</option>`;
                });
                if (currentValue && churches.includes(currentValue)) {
                    selector.value = currentValue;
                }
            }
        });
    }

    // Record a new expense
    recordExpense(churchName, expenseData) {
        if (!churchName || !expenseData.title || !expenseData.amount || !expenseData.category) {
            throw new Error('Missing required expense information');
        }

        const expense = {
            id: Date.now().toString(),
            title: expenseData.title,
            amount: parseFloat(expenseData.amount),
            category: expenseData.category,
            description: expenseData.description || '',
            date: expenseData.date || new Date().toISOString(),
            timestamp: Date.now()
        };

        this.churches[churchName].expenses.push(expense);
        this.saveData();
        this.updateFinancialOverview(churchName);
        return expense;
    }

    // Get financial summary for a church
    getFinancialSummary(churchName, period = 'all') {
        const church = this.churches[churchName];
        if (!church) return null;

        const now = new Date();
        const startDate = this.getStartDateForPeriod(period);

        // Calculate total income (tithes)
        const tithes = church.tithes || [];
        const totalIncome = tithes
            .filter(tithe => !startDate || new Date(tithe.date) >= startDate)
            .reduce((sum, tithe) => sum + tithe.amount, 0);

        // Calculate total expenses
        const expenses = church.expenses || [];
        const totalExpenses = expenses
            .filter(expense => !startDate || new Date(expense.date) >= startDate)
            .reduce((sum, expense) => sum + expense.amount, 0);

        // Calculate expenses by category
        const expensesByCategory = expenses
            .filter(expense => !startDate || new Date(expense.date) >= startDate)
            .reduce((acc, expense) => {
                acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
                return acc;
            }, {});

        return {
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses,
            expensesByCategory
        };
    }

    // Get start date based on period
    getStartDateForPeriod(period) {
        const now = new Date();
        switch (period) {
            case 'week':
                return new Date(now.setDate(now.getDate() - 7));
            case 'month':
                return new Date(now.setMonth(now.getMonth() - 1));
            case 'year':
                return new Date(now.setFullYear(now.getFullYear() - 1));
            case 'all':
            default:
                return null;
        }
    }

    // Initialize expense charts
    initializeExpenseCharts() {
        // Balance Chart
        const balanceCtx = document.getElementById('balanceChart');
        if (balanceCtx) {
            this.charts.balance = new Chart(balanceCtx, {
                type: 'bar',
                data: {
                    labels: ['Income', 'Expenses', 'Balance'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ['#28a745', '#dc3545', '#007bff']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // Expense Category Chart
        const categoryCtx = document.getElementById('expenseCategoryChart');
        if (categoryCtx) {
            this.charts.expenseCategory = new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#fd7f6f', '#7eb0d5', '#b2e061', '#bd7ebe',
                            '#ffb55a', '#ffee65', '#beb9db', '#fdcce5'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }

    // Update financial charts
    updateFinancialCharts(churchName, period = 'all') {
        const summary = this.getFinancialSummary(churchName, period);
        if (!summary) return;

        // Update Balance Chart
        if (this.charts.balance) {
            this.charts.balance.data.datasets[0].data = [
                summary.totalIncome,
                summary.totalExpenses,
                summary.balance
            ];
            this.charts.balance.update();
        }

        // Update Expense Category Chart
        if (this.charts.expenseCategory) {
            const categories = Object.entries(summary.expensesByCategory)
                .sort((a, b) => b[1] - a[1]);

            this.charts.expenseCategory.data.labels = categories.map(([category]) => 
                category.charAt(0).toUpperCase() + category.slice(1)
            );
            this.charts.expenseCategory.data.datasets[0].data = categories.map(([, amount]) => amount);
            this.charts.expenseCategory.update();
        }
    }

    // Generate unique member ID with church initials
    generateMemberId(churchInitials) {
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        return `${churchInitials.toUpperCase()}${timestamp}${random}`;
    }

    // Utility function to format currency in Euros
    formatEuro(amount) {
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    // Save data to localStorage
    saveData() {
        localStorage.setItem('churches', JSON.stringify(this.churches));
        this.updateExpenseSelectors(); // Add this line to update selectors after saving
    }

    // Show notification
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 4000);
    }

    // Validate church initials
    validateInitials(initials) {
        return /^[A-Za-z]{2,4}$/.test(initials);
    }

    // Register a new church
    registerChurch(churchName, churchInitials) {
        if (!churchName.trim() || !churchInitials.trim()) {
            this.showNotification('Please enter church name and initials', 'error');
            return;
        }

        if (!this.validateInitials(churchInitials)) {
            this.showNotification('Church initials must be 2-4 letters only', 'error');
            return;
        }

        if (this.churches[churchName]) {
            this.showNotification('Church already exists', 'warning');
            return;
        }

        // Check if initials are already used
        const existingInitials = Object.values(this.churches).find(
            church => church.initials.toLowerCase() === churchInitials.toLowerCase()
        );
        
        if (existingInitials) {
            this.showNotification('Church initials already in use', 'error');
            return;
        }

        this.churches[churchName] = {
            initials: churchInitials.toUpperCase(),
            members: {},
            tithes: [],
            memberCounter: 1
        };

        this.saveData();
        this.updateChurchSelectors();
        this.displayChurches();
        this.showNotification(`Church '${churchName}' registered successfully`);
        
        // Clear inputs
        document.getElementById('churchName').value = '';
        document.getElementById('churchInitials').value = '';
    }

    // Register a new member with enhanced details
    registerMember(churchName, name, sex, age, title) {
        if (!churchName || !name.trim() || !sex || !age || !title) {
            this.showNotification('Please fill all member details', 'error');
            return;
        }

        if (age < 1 || age > 120) {
            this.showNotification('Please enter a valid age', 'error');
            return;
        }

        const church = this.churches[churchName];
        const memberId = this.generateMemberId(church.initials);
        
        church.members[memberId] = {
            id: memberId,
            name: name.trim(),
            sex: sex,
            age: parseInt(age),
            title: title,
            status: 'active',
            registeredDate: new Date().toISOString().split('T')[0]
        };

        church.memberCounter++;
        this.saveData();
        this.updateMemberSelectors();
        this.showNotification(`${title} ${name} registered with ID: ${memberId}`);
        
        // Clear inputs
        document.getElementById('memberName').value = '';
        document.getElementById('memberSex').value = '';
        document.getElementById('memberAge').value = '';
        document.getElementById('memberTitle').value = '';
        document.getElementById('memberChurch').value = '';
    }
            // Transfer member between churches
    transferMember(fromChurch, toChurch, memberId) {
        if (!fromChurch || !toChurch || !memberId) {
            this.showNotification('Please fill all transfer fields', 'error');
            return;
        }

        if (fromChurch === toChurch) {
            this.showNotification('Cannot transfer to the same church', 'error');
            return;
        }

        const member = this.churches[fromChurch].members[memberId];
        if (!member) {
            this.showNotification('Member not found', 'error');
            return;
        }

        // Generate new ID with target church initials
        const newMemberId = this.generateMemberId(this.churches[toChurch].initials);
        
        // Add to target church with new ID
        this.churches[toChurch].members[newMemberId] = { 
            ...member, 
            id: newMemberId 
        };
        
        // Update tithe records with new member ID
        this.churches[fromChurch].tithes.forEach(tithe => {
            if (tithe.memberId === memberId) {
                tithe.memberId = newMemberId;
                this.churches[toChurch].tithes.push(tithe);
            }
        });

        // Remove tithes from source church
        this.churches[fromChurch].tithes = this.churches[fromChurch].tithes.filter(
            tithe => tithe.memberId !== memberId
        );
        
        // Remove from source church
        delete this.churches[fromChurch].members[memberId];

        this.saveData();
        this.updateMemberSelectors();
        this.showNotification(`Member transferred from ${fromChurch} to ${toChurch} (New ID: ${newMemberId})`);
        this.hideTransferForm();
    }

    // Flag/Update member status
    flagMember(churchName, memberId, status) {
        if (!churchName || !memberId || !status) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }

        if (!this.churches[churchName].members[memberId]) {
            this.showNotification('Member not found', 'error');
            return;
        }

        this.churches[churchName].members[memberId].status = status;
        this.saveData();
        this.updateMemberSelectors();
        this.displayMembers();
        this.showNotification(`Member status updated to ${status}`);
        this.hideFlagForm();
    }

    // Delete member
    deleteMember(churchName, memberId) {
        if (!churchName || !memberId) {
            this.showNotification('Please select church and member', 'error');
            return;
        }

        if (!this.churches[churchName].members[memberId]) {
            this.showNotification('Member not found', 'error');
            return;
        }

        if (confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
            const memberName = this.churches[churchName].members[memberId].name;
            delete this.churches[churchName].members[memberId];
            
            // Also remove related tithes
            this.churches[churchName].tithes = this.churches[churchName].tithes.filter(
                tithe => tithe.memberId !== memberId
            );

            this.saveData();
            this.updateMemberSelectors();
            this.displayMembers();
            this.showNotification(`Member '${memberName}' deleted successfully`);
        }
    }

    // Record tithe
    recordTithe(churchName, memberId, amount, type) {
        if (!churchName || !memberId || !amount || !type) {
            this.showNotification('Please fill all tithe fields', 'error');
            return;
        }

        if (amount <= 0) {
            this.showNotification('Amount must be greater than 0', 'error');
            return;
        }

        const member = this.churches[churchName].members[memberId];
        const tithe = {
            id: this.generateMemberId('TH'),
            memberId: memberId,
            memberName: member.name,
            memberTitle: member.title,
            date: new Date().toISOString().split('T')[0],
            amount: parseFloat(amount),
            type: type
        };

        this.churches[churchName].tithes.push(tithe);
        this.saveData();
        this.updateTitheCharts();
        this.showNotification(`${type} of ${this.formatEuro(amount)} recorded for ${member.title} ${member.name}`);
        
        // Clear inputs
        document.getElementById('titheAmount').value = '';
        document.getElementById('titheChurch').value = '';
        document.getElementById('titheMember').value = '';
        document.getElementById('titheType').value = 'tithe';
    }

    // Retrieve tithes for a specific member
    retrieveTithes(churchName, memberId) {
        if (!churchName || !memberId) {
            this.showNotification('Please select church and member', 'error');
            return;
        }

        const tithes = this.churches[churchName].tithes.filter(
            tithe => tithe.memberId === memberId
        );

        const member = this.churches[churchName].members[memberId];
        const container = document.getElementById('tithesList');
        
        if (tithes.length === 0) {
            container.innerHTML = '<p>No contributions found for this member.</p>';
            return;
        }

        const totalAmount = tithes.reduce((sum, tithe) => sum + tithe.amount, 0);
        const sortedTithes = tithes.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        container.innerHTML = `
            <div class="list-item">
                <h4>${member.title} ${member.name} (ID: ${member.id})</h4>
                <p><strong>Total Contributions: ${this.formatEuro(totalAmount)}</strong></p>
                <p>Number of Records: ${tithes.length}</p>
            </div>
            ${sortedTithes.map(tithe => `
                <div class="list-item tithe-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${new Date(tithe.date).toLocaleDateString()}</strong>
                            <span class="tithe-type">${tithe.type}</span>
                        </div>
                        <div class="tithe-amount">${this.formatEuro(tithe.amount)}</div>
                    </div>
                </div>
            `).join('')}
        `;
    }

    // Generate tithe reports
    generateReport(churchName, period) {
        if (!churchName || !period) {
            this.showNotification('Please select church and period', 'error');
            return;
        }

        const tithes = this.churches[churchName].tithes;
        const reportData = {};

        tithes.forEach(tithe => {
            const date = new Date(tithe.date);
            let periodKey;

            switch (period) {
                case 'monthly':
                    periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'quarterly':
                    const quarter = Math.ceil((date.getMonth() + 1) / 3);
                    periodKey = `${date.getFullYear()}-Q${quarter}`;
                    break;
                case 'yearly':
                    periodKey = date.getFullYear().toString();
                    break;
            }

            if (!reportData[periodKey]) {
                reportData[periodKey] = 0;
            }
            reportData[periodKey] += tithe.amount;
        });

        const container = document.getElementById('reportResults');
        
        if (Object.keys(reportData).length === 0) {
            container.innerHTML = '<p>No tithe data available for the selected period.</p>';
            return;
        }

        const sortedPeriods = Object.keys(reportData).sort().reverse();
        const grandTotal = Object.values(reportData).reduce((sum, amount) => sum + amount, 0);

        container.innerHTML = `
            <div class="list-item report-item">
                <div class="report-period">Grand Total</div>
                <div class="report-total">${this.formatEuro(grandTotal)}</div>
            </div>
            ${sortedPeriods.map(period => `
                <div class="list-item report-item">
                    <div class="report-period">${period}</div>
                    <div class="report-total">${this.formatEuro(reportData[period])}</div>
                </div>
            `).join('')}
        `;
    }

    // Display all churches
    displayChurches() {
        const container = document.getElementById('churchList');
        const churchNames = Object.keys(this.churches);
        
        if (churchNames.length === 0) {
            container.innerHTML = '<p>No churches registered yet.</p>';
            return;
        }

        container.innerHTML = churchNames.map(churchName => {
            const church = this.churches[churchName];
            const memberCount = Object.keys(church.members).length;
            const titheCount = church.tithes.length;
            const totalTithes = church.tithes.reduce(
                (sum, tithe) => sum + tithe.amount, 0
            );

            return `
                <div class="list-item">
                    <h4>${churchName} (${church.initials})</h4>
                    <p>Members: ${memberCount} | Tithe Records: ${titheCount}</p>
                    <p>Total Contributions: ${this.formatEuro(totalTithes)}</p>
                </div>
            `;
        }).join('');
    }

    // Display members for selected church with search functionality
    displayMembers() {
        const churchName = document.getElementById('viewChurch').value;
        const searchTerm = document.getElementById('searchMembers').value.toLowerCase();
        const container = document.getElementById('membersList');
        
        if (!churchName) {
            container.innerHTML = '';
            return;
        }

        const members = Object.values(this.churches[churchName].members);
        
        if (members.length === 0) {
            container.innerHTML = '<p>No members found in this church.</p>';
            return;
        }

        // Filter members based on search term
        const filteredMembers = members.filter(member => 
            member.name.toLowerCase().includes(searchTerm) ||
            member.id.toLowerCase().includes(searchTerm) ||
            member.title.toLowerCase().includes(searchTerm)
        );

        if (filteredMembers.length === 0) {
            container.innerHTML = '<p>No members match your search criteria.</p>';
            return;
        }

        // Sort members by name
        const sortedMembers = filteredMembers.sort((a, b) => a.name.localeCompare(b.name));

        container.innerHTML = sortedMembers.map(member => `
            <div class="list-item">
                <div class="member-item">
                    <div class="member-details">
                        <strong>${member.title} ${member.name}</strong>
                        <br>
                        <span class="member-id">ID: ${member.id}</span>
                        <div class="member-info">
                            <span><strong>Sex:</strong> ${member.sex}</span>
                            <span><strong>Age:</strong> ${member.age}</span>
                            <span><strong>Registered:</strong> ${new Date(member.registeredDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <span class="member-status status-${member.status}">${member.status}</span>
                </div>
            </div>
        `).join('');
    }

    // Search members functionality
    searchMembers() {
        this.displayMembers();
    }

    // Update all church selector dropdowns
    updateChurchSelectors() {
        const churchNames = Object.keys(this.churches);
        const selectors = [
            'memberChurch', 'actionChurch', 'targetChurch', 'viewChurch',
            'titheChurch', 'viewTitheChurch', 'reportChurch', 'chartChurch', 'topContributorsChurch'
        ];

        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (selector) {
                const currentValue = selector.value;
                selector.innerHTML = '<option value="">Select Church</option>' +
                    churchNames.map(name => 
                        `<option value="${name}" ${name === currentValue ? 'selected' : ''}>${name} (${this.churches[name].initials})</option>`
                    ).join('');
            }
        });
    }

    // Update member selector dropdowns
    updateMemberSelectors() {
        const churchName = document.getElementById('actionChurch').value;
        const memberSelector = document.getElementById('memberId');
        
        if (!churchName || !memberSelector) return;

        const members = Object.values(this.churches[churchName].members);
        memberSelector.innerHTML = '<option value="">Select Member</option>' +
            members.map(member => 
                `<option value="${member.id}">${member.title} ${member.name} (${member.id}) - ${member.status}</option>`
            ).join('');
    }

    // Load members for tithe recording
    loadMembersForTithe() {
        const churchName = document.getElementById('titheChurch').value;
        const memberSelector = document.getElementById('titheMember');
        
        if (!churchName) {
            memberSelector.innerHTML = '<option value="">Select Member</option>';
            return;
        }

        const members = Object.values(this.churches[churchName].members)
            .filter(member => member.status === 'active')
            .sort((a, b) => a.name.localeCompare(b.name));
            
        memberSelector.innerHTML = '<option value="">Select Member</option>' +
            members.map(member => 
                `<option value="${member.id}">${member.title} ${member.name} (${member.id})</option>`
            ).join('');
    }

    // Load members for tithe viewing
    loadMembersForView() {
        const churchName = document.getElementById('viewTitheChurch').value;
        const memberSelector = document.getElementById('viewTitheMember');
        
        if (!churchName) {
            memberSelector.innerHTML = '<option value="">Select Member</option>';
            return;
        }

        const members = Object.values(this.churches[churchName].members)
            .sort((a, b) => a.name.localeCompare(b.name));
            
        memberSelector.innerHTML = '<option value="">Select Member</option>' +
            members.map(member => 
                `<option value="${member.id}">${member.title} ${member.name} (${member.id})</option>`
            ).join('');
    }

    // Initialize charts
    initializeCharts() {
        // Initialize empty charts
        this.initTitheTypeChart();
        this.initMonthlyTrendChart();
        this.initTopContributorsChart();
    }

        // Initialize tithe type chart
    initTitheTypeChart() {
        const ctx = document.getElementById('titheTypeChart').getContext('2d');
        this.charts.titheType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Tithe', 'Offering', 'Donation', 'Special Collection'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#007bff',
                        '#28a745',
                        '#ffc107',
                        '#dc3545'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: €${value.toLocaleString('de-DE', {minimumFractionDigits: 2})}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Initialize monthly trend chart
    initMonthlyTrendChart() {
        const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
        this.charts.monthlyTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Monthly Contributions',
                    data: [],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#007bff',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `€${context.parsed.y.toLocaleString('de-DE', {minimumFractionDigits: 2})}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '€' + value.toLocaleString('de-DE');
                            }
                        }
                    }
                }
            }
        });
    }

    // Initialize top contributors chart
    initTopContributorsChart() {
        const ctx = document.getElementById('topContributorsChart').getContext('2d');
        this.charts.topContributors = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Total Contributions',
                    data: [],
                    backgroundColor: [
                        '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1',
                        '#20c997', '#fd7e14', '#e83e8c', '#6c757d', '#17a2b8'
                    ],
                    borderWidth: 1,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `€${context.parsed.y.toLocaleString('de-DE', {minimumFractionDigits: 2})}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '€' + value.toLocaleString('de-DE');
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    // Update tithe charts
    updateTitheCharts() {
        const churchName = document.getElementById('chartChurch').value;
        if (!churchName) return;

        this.updateTitheTypeChart(churchName);
        this.updateMonthlyTrendChart(churchName);
    }

    // Update tithe type chart data
    updateTitheTypeChart(churchName) {
        const tithes = this.churches[churchName].tithes;
        const typeData = {
            'tithe': 0,
            'offering': 0,
            'donation': 0,
            'special': 0
        };

        tithes.forEach(tithe => {
            typeData[tithe.type] += tithe.amount;
        });

        this.charts.titheType.data.datasets[0].data = [
            typeData.tithe,
            typeData.offering,
            typeData.donation,
            typeData.special
        ];
        this.charts.titheType.update();
    }

    // Update monthly trend chart data
    updateMonthlyTrendChart(churchName) {
        const tithes = this.churches[churchName].tithes;
        const monthlyData = {};

        tithes.forEach(tithe => {
            const date = new Date(tithe.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = 0;
            }
            monthlyData[monthKey] += tithe.amount;
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const last12Months = sortedMonths.slice(-12);

        const labels = last12Months.map(month => {
            const [year, monthNum] = month.split('-');
            const date = new Date(year, monthNum - 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });

        const data = last12Months.map(month => monthlyData[month]);

        this.charts.monthlyTrend.data.labels = labels;
        this.charts.monthlyTrend.data.datasets[0].data = data;
        this.charts.monthlyTrend.update();
    }

    // Show top contributors
    showTopContributors() {
        const churchName = document.getElementById('topContributorsChurch').value;
        if (!churchName) {
            this.charts.topContributors.data.labels = [];
            this.charts.topContributors.data.datasets[0].data = [];
            this.charts.topContributors.update();
            return;
        }

        const tithes = this.churches[churchName].tithes;
        const members = this.churches[churchName].members;
        const contributorData = {};

        tithes.forEach(tithe => {
            if (!contributorData[tithe.memberId]) {
                contributorData[tithe.memberId] = {
                    name: tithe.memberName,
                    title: tithe.memberTitle,
                    total: 0
                };
            }
            contributorData[tithe.memberId].total += tithe.amount;
        });

        const sortedContributors = Object.values(contributorData)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        const labels = sortedContributors.map(contributor => 
            `${contributor.title} ${contributor.name}`
        );
        const data = sortedContributors.map(contributor => contributor.total);

        this.charts.topContributors.data.labels = labels;
        this.charts.topContributors.data.datasets[0].data = data;
        this.charts.topContributors.update();
    }

    // Show/Hide forms
    showTransferForm() {
        const churchName = document.getElementById('actionChurch').value;
        const memberId = document.getElementById('memberId').value;
        
        if (!churchName || !memberId) {
            this.showNotification('Please select church and member first', 'error');
            return;
        }
        
        document.getElementById('transferForm').classList.remove('hidden');
        document.getElementById('flagForm').classList.add('hidden');
        
        // Update target church options (exclude current church)
        const targetSelector = document.getElementById('targetChurch');
        const churchNames = Object.keys(this.churches).filter(name => name !== churchName);
        targetSelector.innerHTML = '<option value="">Select Target Church</option>' +
            churchNames.map(name => `<option value="${name}">${name} (${this.churches[name].initials})</option>`).join('');
    }

    hideTransferForm() {
        document.getElementById('transferForm').classList.add('hidden');
    }

    showFlagForm() {
        const churchName = document.getElementById('actionChurch').value;
        const memberId = document.getElementById('memberId').value;
        
        if (!churchName || !memberId) {
            this.showNotification('Please select church and member first', 'error');
            return;
        }
        
        document.getElementById('flagForm').classList.remove('hidden');
        document.getElementById('transferForm').classList.add('hidden');
        
        // Set current status
        const currentStatus = this.churches[churchName].members[memberId].status;
        document.getElementById('memberStatus').value = currentStatus;
    }

    hideFlagForm() {
        document.getElementById('flagForm').classList.add('hidden');
    }
}

// Initialize the system
const cms = new ChurchManagementSystem();

// Tab functionality
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Church Management Functions
function registerChurch() {
    const churchName = document.getElementById('churchName').value;
    const churchInitials = document.getElementById('churchInitials').value;
    cms.registerChurch(churchName, churchInitials);
}

// Member Management Functions
function registerMember() {
    const churchName = document.getElementById('memberChurch').value;
    const name = document.getElementById('memberName').value;
    const sex = document.getElementById('memberSex').value;
    const age = document.getElementById('memberAge').value;
    const title = document.getElementById('memberTitle').value;
    cms.registerMember(churchName, name, sex, age, title);
}

function showTransferForm() {
    cms.showTransferForm();
}

function hideTransferForm() {
    cms.hideTransferForm();
}

function transferMember() {
    const fromChurch = document.getElementById('actionChurch').value;
    const toChurch = document.getElementById('targetChurch').value;
    const memberId = document.getElementById('memberId').value;
    cms.transferMember(fromChurch, toChurch, memberId);
}

function showFlagForm() {
    cms.showFlagForm();
}

function hideFlagForm() {
    cms.hideFlagForm();
}

function flagMember() {
    const churchName = document.getElementById('actionChurch').value;
    const memberId = document.getElementById('memberId').value;
    const status = document.getElementById('memberStatus').value;
    cms.flagMember(churchName, memberId, status);
}

function deleteMember() {
    const churchName = document.getElementById('actionChurch').value;
    const memberId = document.getElementById('memberId').value;
    cms.deleteMember(churchName, memberId);
}

function displayMembers() {
    cms.displayMembers();
}

function searchMembers() {
    cms.searchMembers();
}

// Tithe Management Functions
function recordTithe() {
    const churchName = document.getElementById('titheChurch').value;
    const memberId = document.getElementById('titheMember').value;
    const amount = document.getElementById('titheAmount').value;
    const type = document.getElementById('titheType').value;
    cms.recordTithe(churchName, memberId, amount, type);
}

function viewChurchTithes() {
    const churchName = document.getElementById('viewTitheChurch').value;
    cms.viewChurchTithes(churchName);
}

function filterTithes() {
    const churchName = document.getElementById('viewTitheChurch').value;
    const searchTerm = document.getElementById('searchTitheMember').value;
    const memberId = document.getElementById('viewTitheMember').value;
    cms.displayTithes(churchName, searchTerm, memberId);
}

function loadMembersForTithe() {
    cms.loadMembersForTithe();
}

function loadMembersForView() {
    cms.loadMembersForView();
}

function updateTitheCharts() {
    cms.updateTitheCharts();
}

function showTopContributors() {
    cms.showTopContributors();
}

// Report Functions
function generateReport() {
    const churchName = document.getElementById('reportChurch').value;
    const period = document.getElementById('reportPeriod').value;
    cms.generateReport(churchName, period);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize expense selectors
    const expenseChurch = document.getElementById('expenseChurch');
    if (expenseChurch) {
        expenseChurch.addEventListener('change', function() {
            updateExpenseDisplay();
        });
    }

    const overviewChurch = document.getElementById('overviewChurch');
    if (overviewChurch) {
        overviewChurch.addEventListener('change', function() {
            updateFinancialOverview();
        });
    }

    const viewExpenseChurch = document.getElementById('viewExpenseChurch');
    if (viewExpenseChurch) {
        viewExpenseChurch.addEventListener('change', function() {
            displayExpenses();
        });
    }

    // Update member selectors when church is selected
    document.getElementById('actionChurch').addEventListener('change', function() {
        cms.updateMemberSelectors();
        // Hide forms when church changes
        document.getElementById('transferForm').classList.add('hidden');
        document.getElementById('flagForm').classList.add('hidden');
    });
    
    // Enter key support for forms
    document.getElementById('churchName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') registerChurch();
    });
    
    document.getElementById('churchInitials').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') registerChurch();
    });
    
    document.getElementById('memberName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') registerMember();
    });
    
    document.getElementById('titheAmount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') recordTithe();
    });
    
    // Auto-format Euro amounts
    document.getElementById('titheAmount').addEventListener('input', function(e) {
        let value = e.target.value;
        if (value && !isNaN(value)) {
            // Ensure only 2 decimal places
            if (value.includes('.') && value.split('.')[1].length > 2) {
                e.target.value = parseFloat(value).toFixed(2);
            }
        }
    });

        // Church initials validation
    document.getElementById('churchInitials').addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase();
    });

    // Age validation
    document.getElementById('memberAge').addEventListener('input', function(e) {
        const value = parseInt(e.target.value);
        if (value < 1) e.target.value = 1;
        if (value > 120) e.target.value = 120;
    });
});

// Export/Import functionality
function exportData() {
    const dataStr = JSON.stringify(cms.churches, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `church_data_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    cms.showNotification('Data exported successfully');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (confirm('This will replace all current data. Are you sure?')) {
                cms.churches = importedData;
                cms.saveData();
                cms.updateChurchSelectors();
                cms.displayChurches();
                cms.showNotification('Data imported successfully');
            }
        } catch (error) {
            cms.showNotification('Invalid file format', 'error');
        }
    };
    reader.readAsText(file);
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                showTab('church-management');
                break;
            case '2':
                e.preventDefault();
                showTab('member-management');
                break;
            case '3':
                e.preventDefault();
                showTab('tithe-management');
                break;
            case '4':
                e.preventDefault();
                showTab('reports');
                break;
        }
    }
});

// Print functionality
function printMembershipReport() {
    const churchName = document.getElementById('viewChurch').value;
    if (!churchName) {
        cms.showNotification('Please select a church first!', 'error');
        return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const church = cms.churches[churchName];
    const members = Object.values(church.members);
    const stats = getChurchStatistics(churchName);

    // Generate the print content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Membership Report - ${churchName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .print-header { text-align: center; margin-bottom: 30px; }
                .member-item { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; }
                .member-info { margin-top: 10px; }
                .stats-section { margin-bottom: 30px; padding: 15px; background: #f8f9fa; }
                .print-footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                @media print {
                    body { padding: 0; }
                    .member-item { break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>⛪ ${churchName} - Membership Report</h1>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="stats-section">
                <h2>Church Statistics</h2>
                <p>Total Members: ${stats.totalMembers}</p>
                <p>Active Members: ${stats.activeMembers}</p>
                <p>Male Members: ${stats.maleMembers} | Female Members: ${stats.femaleMembers}</p>
                <p>Average Age: ${stats.averageAge} years</p>
            </div>

            <h2>Member List</h2>
            ${members.map(member => `
                <div class="member-item">
                    <strong>${member.title} ${member.name}</strong> (ID: ${member.id})
                    <div class="member-info">
                        <p>Sex: ${member.sex} | Age: ${member.age} | Status: ${member.status}</p>
                    </div>
                </div>
            `).join('')}

            <div class="print-footer">
                <p>Church Management System - Confidential Document</p>
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
    };
}

function printTitheReport() {
    const churchName = document.getElementById('viewTitheChurch').value;
    const memberId = document.getElementById('viewTitheMember').value;
    const searchTerm = document.getElementById('searchTitheMember').value;

    if (!churchName) {
        cms.showNotification('Please select a church!', 'error');
        return;
    }

    const church = cms.churches[churchName];
    let tithes = church.tithes || [];
    
    // Apply filters if they exist
    if (memberId) {
        tithes = tithes.filter(tithe => tithe.memberId === memberId);
    }
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        tithes = tithes.filter(tithe => {
            const member = church.members[tithe.memberId];
            return member && (
                member.name.toLowerCase().includes(searchLower) ||
                member.title.toLowerCase().includes(searchLower)
            );
        });
    }

    // Sort tithes by date
    tithes.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate totals by type and member
    const totalsByType = tithes.reduce((acc, tithe) => {
        acc[tithe.type] = (acc[tithe.type] || 0) + tithe.amount;
        return acc;
    }, {});

    // Calculate totals by member
    const totalsByMember = tithes.reduce((acc, tithe) => {
        if (!acc[tithe.memberId]) {
            acc[tithe.memberId] = 0;
        }
        acc[tithe.memberId] += tithe.amount;
        return acc;
    }, {});

    const printWindow = window.open('', '_blank');
    const isAllMembers = !memberId;
    const totalAmount = tithes.reduce((sum, t) => sum + t.amount, 0);

    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tithe Report - ${churchName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .print-header { text-align: center; margin-bottom: 30px; }
                .tithe-item { margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }
                .summary-section { margin-bottom: 30px; padding: 15px; background: #f8f9fa; }
                .member-section { margin-bottom: 40px; padding: 15px; border: 1px solid #ddd; page-break-inside: avoid; }
                .member-header { background: #f8f9fa; padding: 10px; margin-bottom: 15px; }
                .print-footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                .total { font-weight: bold; color: #28a745; font-size: 1.2em; }
                .subtitle { color: #666; font-size: 0.9em; }
                .member-total { color: #28a745; font-weight: bold; }
                @media print {
                    body { padding: 0; }
                    .member-section { break-inside: avoid; }
                    .summary-section { break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>Tithe Report</h1>
                <h2>${churchName}</h2>
                ${isAllMembers ? 
                    `<p>Complete Church Tithe Report</p>` : 
                    `<p>Member Report: ${church.members[memberId].title} ${church.members[memberId].name}</p>`
                }
                <p class="subtitle">Generated on ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="summary-section">
                <h2>Overall Summary</h2>
                <p class="total">Total Contributions: ${cms.formatEuro(totalAmount)}</p>
                <h3>Breakdown by Type:</h3>
                ${Object.entries(totalsByType).map(([type, amount]) => `
                    <p>${type.charAt(0).toUpperCase() + type.slice(1)}: ${cms.formatEuro(amount)} 
                       (${((amount/totalAmount) * 100).toFixed(1)}%)</p>
                `).join('')}
            </div>

            ${isAllMembers ? `
                <h2>Member Contributions</h2>
                ${Object.entries(totalsByMember).sort((a, b) => b[1] - a[1]).map(([memberId, total]) => {
                    const member = church.members[memberId];
                    const memberTithes = tithes.filter(t => t.memberId === memberId);
                    return `
                        <div class="member-section">
                            <div class="member-header">
                                <h3>${member.title} ${member.name} (ID: ${member.id})</h3>
                                <p class="member-total">Total Contributions: ${cms.formatEuro(total)}</p>
                            </div>
                            ${memberTithes.map(tithe => `
                                <div class="tithe-item">
                                    <p>Date: ${new Date(tithe.date).toLocaleDateString()}</p>
                                    <p>Type: ${tithe.type.charAt(0).toUpperCase() + tithe.type.slice(1)}</p>
                                    <p>Amount: ${cms.formatEuro(tithe.amount)}</p>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }).join('')}
            ` : `
                <h2>Detailed Records</h2>
                ${tithes.map(tithe => `
                    <div class="tithe-item">
                        <p>Date: ${new Date(tithe.date).toLocaleDateString()}</p>
                        <p>Type: ${tithe.type.charAt(0).toUpperCase() + tithe.type.slice(1)}</p>
                        <p>Amount: ${cms.formatEuro(tithe.amount)}</p>
                    </div>
                `).join('')}
            `}

            <div class="print-footer">
                <p>Church Management System - Confidential Financial Record</p>
                <p>This document is for internal use only</p>
                <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
    };
}

function printReport() {
    window.print();
}

// Clear all data (with confirmation)
function clearAllData() {
    if (confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
        if (confirm('This will permanently delete all churches, members, and tithe records. Continue?')) {
            localStorage.removeItem('churches');
            cms.churches = {};
            cms.updateChurchSelectors();
            cms.displayChurches();
            cms.showNotification('All data cleared', 'warning');
            
            // Reset all charts
            cms.initializeCharts();
        }
    }
}

// Advanced search functionality
function advancedMemberSearch() {
    const searchTerm = document.getElementById('searchMembers').value.toLowerCase();
    const churchName = document.getElementById('viewChurch').value;
    
    if (!churchName) return;
    
    const members = Object.values(cms.churches[churchName].members);
    const container = document.getElementById('membersList');
    
    if (searchTerm === '') {
        cms.displayMembers();
        return;
    }
    
    const filteredMembers = members.filter(member => {
        return member.name.toLowerCase().includes(searchTerm) ||
               member.id.toLowerCase().includes(searchTerm) ||
               member.title.toLowerCase().includes(searchTerm) ||
               member.sex.toLowerCase().includes(searchTerm) ||
               member.status.toLowerCase().includes(searchTerm) ||
               member.age.toString().includes(searchTerm);
    });
    
    if (filteredMembers.length === 0) {
        container.innerHTML = `<p>No members found matching "${searchTerm}"</p>`;
        return;
    }
    
    const sortedMembers = filteredMembers.sort((a, b) => a.name.localeCompare(b.name));
    
    container.innerHTML = sortedMembers.map(member => {
        // Highlight search term
        const highlightText = (text, term) => {
            if (!term) return text;
            const regex = new RegExp(`(${term})`, 'gi');
            return text.replace(regex, '<span class="search-highlight">$1</span>');
        };
        
        return `
            <div class="list-item">
                <div class="member-item">
                    <div class="member-details">
                        <strong>${highlightText(`${member.title} ${member.name}`, searchTerm)}</strong>
                        <br>
                        <span class="member-id">ID: ${highlightText(member.id, searchTerm)}</span>
                        <div class="member-info">
                            <span><strong>Sex:</strong> ${highlightText(member.sex, searchTerm)}</span>
                            <span><strong>Age:</strong> ${highlightText(member.age.toString(), searchTerm)}</span>
                            <span><strong>Registered:</strong> ${new Date(member.registeredDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <span class="member-status status-${member.status}">${member.status}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Statistics functions
function getChurchStatistics(churchName) {
    const church = cms.churches[churchName];
    if (!church) return null;
    
    const members = Object.values(church.members);
    const tithes = church.tithes;
    
    return {
        totalMembers: members.length,
        activeMembers: members.filter(m => m.status === 'active').length,
        inactiveMembers: members.filter(m => m.status === 'inactive').length,
        suspendedMembers: members.filter(m => m.status === 'suspended').length,
        maleMembers: members.filter(m => m.sex === 'Male').length,
        femaleMembers: members.filter(m => m.sex === 'Female').length,
        averageAge: members.length > 0 ? Math.round(members.reduce((sum, m) => sum + m.age, 0) / members.length) : 0,
        totalTithes: tithes.length,
        totalAmount: tithes.reduce((sum, t) => sum + t.amount, 0),
        averageContribution: tithes.length > 0 ? tithes.reduce((sum, t) => sum + t.amount, 0) / tithes.length : 0
    };
}

// Generate comprehensive church report
function generateComprehensiveReport() {
    const churchName = document.getElementById('reportChurch').value;
    if (!churchName) {
        cms.showNotification('Please select a church', 'error');
        return;
    }
    
    const stats = getChurchStatistics(churchName);
    const church = cms.churches[churchName];
    
    const reportHtml = `
        <div class="comprehensive-report">
            <h3>${churchName} (${church.initials}) - Comprehensive Report</h3>
            <div class="report-grid">
                <div class="report-section">
                    <h4>Member Statistics</h4>
                    <p>Total Members: <strong>${stats.totalMembers}</strong></p>
                    <p>Active: <strong>${stats.activeMembers}</strong></p>
                    <p>Inactive: <strong>${stats.inactiveMembers}</strong></p>
                    <p>Suspended: <strong>${stats.suspendedMembers}</strong></p>
                    <p>Male: <strong>${stats.maleMembers}</strong></p>
                    <p>Female: <strong>${stats.femaleMembers}</strong></p>
                    <p>Average Age: <strong>${stats.averageAge} years</strong></p>
                </div>
                <div class="report-section">
                    <h4>Financial Statistics</h4>
                    <p>Total Contributions: <strong>${cms.formatEuro(stats.totalAmount)}</strong></p>
                    <p>Number of Records: <strong>${stats.totalTithes}</strong></p>
                    <p>Average Contribution: <strong>${cms.formatEuro(stats.averageContribution)}</strong></p>
                </div>
            </div>
            <p class="report-date">Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
    `;
    
    document.getElementById('reportResults').innerHTML = reportHtml;
}

// Backup reminder
function checkBackupReminder() {
    const lastBackup = localStorage.getItem('lastBackup');
    const now = new Date().getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds
    
    if (!lastBackup || (now - parseInt(lastBackup)) > oneWeek) {
        setTimeout(() => {
            if (confirm('It\'s been a while since your last backup. Would you like to export your data now?')) {
                exportData();
                localStorage.setItem('lastBackup', now.toString());
            }
        }, 5000); // Show after 5 seconds
    }
}

// Initialize backup reminder
setTimeout(checkBackupReminder, 10000); // Check after 10 seconds

// Auto-save functionality
setInterval(() => {
    cms.saveData();
}, 30000); // Auto-save every 30 seconds

// Add some utility functions for better UX
function formatMemberName(member) {
    return `${member.title} ${member.name}`;
}

function getMemberById(churchName, memberId) {
    return cms.churches[churchName]?.members[memberId];
}

function getTotalContributionsByMember(churchName, memberId) {
    const tithes = cms.churches[churchName]?.tithes || [];
    return tithes
        .filter(tithe => tithe.memberId === memberId)
        .reduce((sum, tithe) => sum + tithe.amount, 0);
}

// Enhanced member display with contribution info
function displayMembersWithContributions() {
    const churchName = document.getElementById('viewChurch').value;
    const container = document.getElementById('membersList');
    
    if (!churchName) {
        container.innerHTML = '';
        return;
    }

    const members = Object.values(cms.churches[churchName].members);
    
    if (members.length === 0) {
        container.innerHTML = '<p>No members found in this church.</p>';
        return;
    }

    const sortedMembers = members.sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = sortedMembers.map(member => {
        const totalContributions = getTotalContributionsByMember(churchName, member.id);
        const contributionCount = cms.churches[churchName].tithes.filter(
            tithe => tithe.memberId === member.id
        ).length;
        
        return `
            <div class="list-item">
                <div class="member-item">
                    <div class="member-details">
                        <strong>${member.title} ${member.name}</strong>
                        <br>
                        <span class="member-id">ID: ${member.id}</span>
                        <div class="member-info">
                            <span><strong>Sex:</strong> ${member.sex}</span>
                            <span><strong>Age:</strong> ${member.age}</span>
                            <span><strong>Registered:</strong> ${new Date(member.registeredDate).toLocaleDateString()}</span>
                            <span><strong>Contributions:</strong> ${cms.formatEuro(totalContributions)} (${contributionCount} records)</span>
                        </div>
                    </div>
                    <span class="member-status status-${member.status}">${member.status}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Update the original displayMembers function to use the enhanced version
cms.displayMembers = displayMembersWithContributions;

// Login/Register functionality
function toggleForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleBtns = document.querySelectorAll('.toggle-btn');

    if (formType === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        toggleBtns[0].classList.add('active');
        toggleBtns[1].classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        toggleBtns[0].classList.remove('active');
        toggleBtns[1].classList.add('active');
    }
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (cms.checkLogin(username, password)) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('mainContent').classList.remove('hidden');
        cms.showNotification('Login successful!', 'success');
    } else {
        cms.showNotification('Invalid username or password!', 'error');
    }
}

function register() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const email = document.getElementById('regEmail').value;

    // Validate input
    if (!username || !password || !confirmPassword || !email) {
        cms.showNotification('Please fill in all fields!', 'error');
        return;
    }

    if (password !== confirmPassword) {
        cms.showNotification('Passwords do not match!', 'error');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        cms.showNotification('Please enter a valid email address!', 'error');
        return;
    }

    try {
        cms.registerUser(username, password, email);
        cms.showNotification('Registration successful! Please login.', 'success');
        toggleForm('login');
        // Clear registration form
        document.getElementById('regUsername').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regConfirmPassword').value = '';
        document.getElementById('regEmail').value = '';
    } catch (error) {
        cms.showNotification(error.message, 'error');
    }
}

function logout() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    cms.showNotification('Logged out successfully!', 'success');
}

// Expense Management Functions
function recordExpense() {
    const churchName = document.getElementById('expenseChurch').value;
    const title = document.getElementById('expenseTitle').value;
    const amount = document.getElementById('expenseAmount').value;
    const category = document.getElementById('expenseCategory').value;
    const date = document.getElementById('expenseDate').value;
    const description = document.getElementById('expenseDescription').value;

    if (!churchName || !title || !amount || !category || !date) {
        cms.showNotification('Please fill in all required fields!', 'error');
        return;
    }

    try {
        cms.recordExpense(churchName, {
            title,
            amount,
            category,
            date,
            description
        });
        
        // Clear form
        document.getElementById('expenseTitle').value = '';
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseCategory').value = '';
        document.getElementById('expenseDescription').value = '';
        
        cms.showNotification('Expense recorded successfully!', 'success');
        updateFinancialOverview();
        displayExpenses();
    } catch (error) {
        cms.showNotification(error.message, 'error');
    }
}

function updateFinancialOverview() {
    const churchName = document.getElementById('overviewChurch').value;
    const period = document.getElementById('overviewPeriod').value;

    if (!churchName) {
        document.getElementById('financialSummary').innerHTML = '<p>Please select a church</p>';
        return;
    }

    const summary = cms.getFinancialSummary(churchName, period);
    
    document.getElementById('financialSummary').innerHTML = `
        <div class="financial-card">
            <h4>Total Income</h4>
            <div class="financial-amount income-amount">${cms.formatEuro(summary.totalIncome)}</div>
        </div>
        <div class="financial-card">
            <h4>Total Expenses</h4>
            <div class="financial-amount expense-amount">${cms.formatEuro(summary.totalExpenses)}</div>
        </div>
        <div class="financial-card">
            <h4>Current Balance</h4>
            <div class="financial-amount balance-amount">${cms.formatEuro(summary.balance)}</div>
        </div>
    `;

    cms.updateFinancialCharts(churchName, period);
}

function displayExpenses() {
    const churchName = document.getElementById('viewExpenseChurch').value;
    filterExpenses();
}

function filterExpenses() {
    const churchName = document.getElementById('viewExpenseChurch').value;
    const searchTerm = document.getElementById('searchExpense').value.toLowerCase();
    const category = document.getElementById('filterExpenseCategory').value;

    if (!churchName) {
        document.getElementById('expensesList').innerHTML = '<p>Please select a church</p>';
        return;
    }

    const church = cms.churches[churchName];
    let expenses = church.expenses || [];

    // Apply filters
    if (category) {
        expenses = expenses.filter(expense => expense.category === category);
    }
    if (searchTerm) {
        expenses = expenses.filter(expense => 
            expense.title.toLowerCase().includes(searchTerm) ||
            expense.description.toLowerCase().includes(searchTerm)
        );
    }

    // Sort by date (most recent first)
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    const container = document.getElementById('expensesList');
    if (expenses.length === 0) {
        container.innerHTML = '<p>No expenses found</p>';
        return;
    }

    container.innerHTML = expenses.map(expense => `
        <div class="expense-item">
            <div class="expense-details">
                <div class="expense-title">${expense.title}</div>
                <span class="expense-category">${expense.category}</span>
                <div class="expense-meta">
                    <span>Date: ${new Date(expense.date).toLocaleDateString()}</span>
                    ${expense.description ? `<p>${expense.description}</p>` : ''}
                </div>
            </div>
            <div class="expense-amount">${cms.formatEuro(expense.amount)}</div>
        </div>
    `).join('');
}

function printFinancialReport() {
    const churchName = document.getElementById('overviewChurch').value;
    const period = document.getElementById('overviewPeriod').value;

    if (!churchName) {
        cms.showNotification('Please select a church!', 'error');
        return;
    }

    const church = cms.churches[churchName];
    const summary = cms.getFinancialSummary(churchName, period);
    const periodText = {
        'all': 'All Time',
        'year': 'This Year',
        'month': 'This Month',
        'week': 'This Week'
    }[period];

    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Financial Report - ${churchName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .print-header { text-align: center; margin-bottom: 30px; }
                .summary-section { margin-bottom: 30px; padding: 15px; background: #f8f9fa; }
                .expense-section { margin-bottom: 20px; }
                .expense-item { margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; }
                .total { font-weight: bold; color: #28a745; }
                .category-total { margin-bottom: 10px; }
                @media print {
                    body { padding: 0; }
                    .expense-item { break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>Financial Report</h1>
                <h2>${churchName}</h2>
                <p>Period: ${periodText}</p>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>

            <div class="summary-section">
                <h2>Financial Summary</h2>
                <p>Total Income: ${cms.formatEuro(summary.totalIncome)}</p>
                <p>Total Expenses: ${cms.formatEuro(summary.totalExpenses)}</p>
                <p class="total">Current Balance: ${cms.formatEuro(summary.balance)}</p>
            </div>

            <div class="expense-section">
                <h2>Expenses by Category</h2>
                ${Object.entries(summary.expensesByCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => `
                        <div class="category-total">
                            <strong>${category.charAt(0).toUpperCase() + category.slice(1)}:</strong> 
                            ${cms.formatEuro(amount)}
                            (${((amount/summary.totalExpenses) * 100).toFixed(1)}%)
                        </div>
                    `).join('')}
            </div>

            <div class="expense-section">
                <h2>Recent Expenses</h2>
                ${church.expenses
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 20)
                    .map(expense => `
                        <div class="expense-item">
                            <p><strong>${expense.title}</strong> (${expense.category})</p>
                            <p>Date: ${new Date(expense.date).toLocaleDateString()}</p>
                            <p>Amount: ${cms.formatEuro(expense.amount)}</p>
                            ${expense.description ? `<p>Description: ${expense.description}</p>` : ''}
                        </div>
                    `).join('')}
            </div>

            <div class="print-footer">
                <p>Church Management System - Financial Report</p>
                <p>This document is confidential and for internal use only</p>
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = function() {
        printWindow.print();
    };
}

console.log('Church Management System loaded successfully!');
