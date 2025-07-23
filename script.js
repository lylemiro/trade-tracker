// --- GLOBAL VARIABLES (Accessible throughout the script) ---
// Chart Instances
let monthlyPnLChart = null;
let monthlyVolumeChart = null;
let dailyRoiChart = null;
let dailyPnLChart = null;
let dailyVolumeChart = null;
let discrepancyChart = null;
let cumulativeBalanceChart = null;
let projectedGrowthChart = null;

// Data Storage
const DEFAULT_APP_SETTINGS = {
    usdtPhpRate: 57.11,
    targetMonthlyIncomePhp: 50000,
    startingBalanceUsdt: 301,
    projectedGainPerTrade: 1,
    tradesPerDay: 2,
    projectionPeriodDays: 90,
    projectedTradeAmount: 3.00,
    projectedRoiPerTrade: 70,
    selectedProjectionMethod: 'percent',
    theme: 'light',
    schedulePlanner: '',
    targetTradingVolume: 300 // FIX: Added missing default value
};
const DEFAULT_BALANCE_DATA = {
    previousBalanceUsdt: 0,
    calculatedBalanceUsdt: 0,
    actualBalanceUsdt: 0,
};
const DEFAULT_LAST_TRADE_STATS = {
    currentGainUsdt: 0,
    currentRoi: 0,
    previousGainUsdt: 0,
    lastTradeAmount: 0,
    previousTradeAmount: 0
};
const DEFAULT_DISCREPANCY_HISTORY = [];
const DEFAULT_CUMULATIVE_BALANCE_HISTORY = [];
const DEFAULT_PROJECTED_GROWTH_HISTORY = [];

let tradeHistory = [];
let appSettings = { ...DEFAULT_APP_SETTINGS };
let balanceData = { ...DEFAULT_BALANCE_DATA };
let lastTradeStats = { ...DEFAULT_LAST_TRADE_STATS };
let discrepancyHistory = [];
let cumulativeBalanceHistory = [];
let projectedGrowthHistory = [];

// Setup Modal State
let currentSetupStep = 0;
const setupSteps = [
    {
        title: "Welcome to Your Trade Tracker!",
        body: `
            <p>This tracker helps you monitor your trading progress, visualize gains, and reconcile your wallet balance. Let's set it up!</p>
            <p>Click 'Next' to proceed through the guided setup.</p>
        `
    },
    {
        title: "Step 1: Set Your Starting Balance & Goals",
        body: `
            <p>On the main dashboard, locate the <strong>'Financial Goals & Settings'</strong> card.</p>
            <ol>
                <li>Enter your initial trading capital in the <strong>'Starting Balance (USDT)'</strong> field.</li>
                <li>Adjust the <strong>'USDT/PHP Rate'</strong> and <strong>'Target Monthly Income (₱)'</strong> as needed.</li>
                <li>Select your preferred **'Projection Method'** using the radio buttons.</li>
                <li>Based on your selected method, adjust the corresponding inputs (e.g., 'Projected Gain Per Trade (%):' or 'Projected Trade Amount (USDT):'). Also set 'Trades Per Day' and 'Projection Period (Days)'.</li>
                <li>Set your <strong>'Target Trading Volume (USDT)'</strong> if you have a specific volume requirement.</li>
            </ol>
        `
    },
    {
        title: "Step 2: Paste Your Detailed Trade History",
        body: `
            <p>Copy your detailed trade history from your exchange. It should look like the example below the input box.</p>
            <p>Paste it into the <strong>'Input Detailed Trade History'</strong> textarea.</p>
            <p>Click <strong>'Process Detailed Trades'</strong>. Your trades will appear below and metrics will update.</p>
            <p style="font-size: 0.9em; color: var(--text-color-muted);">*The tracker will automatically ignore header text and process only valid trade blocks.*</p>
        `
    },
    {
        title: "Step 3: Update Your Actual Current Balance",
        body: `
            <p>Now, look at the <strong>'Balance Overview'</strong> card on the main dashboard.</p>
            <ol>
                <li>Find the field labeled <strong>'Actual Current Balance (USDT)'</strong>.</li>
                <li>Check your live balance on your exchange and carefully enter it into this field.</li>
            </ol>
            <p>The tracker will automatically calculate and display the discrepancy below.</p>
        `
    },
    {
        title: "Step 4: Arrange Your Dashboard",
        body: `
            <p>You can now customize your dashboard layout!</p>
            <p>Simply <strong>click and drag any card by its title</strong> to move it to a new position.</p>
            <p>Arrange the dashboard in a way that works best for your daily routine.</p>
        `
    },
    {
        title: "Step 5: You're All Set!",
        body: `
            <p>You're all set up!</p>
            <p>Periodically paste new trade history to keep your tracker up-to-date. Remember to also update your 'Actual Current Balance' regularly.</p>
            <p>If you ever need to start fresh, use the red 'Reset All Data' button at the bottom.</p>
            <p>Happy tracking!</p>
        `
    }
];


// --- Helper Functions (Global for clarity) ---

function cleanLine(line) {
    return line.replace(/[\u00A0\u200B-\u200D\uFEFF]/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
}

function formatCurrency(amount, currency = 'USDT') {
    return `${amount.toFixed(2)} ${currency}`;
}

function formatPhp(amount) {
    return `₱${amount.toFixed(2)}`;
}

function formatDecimalPercentage(value) {
    return `${value.toFixed(2)} %`;
}

function formatPercentage(value) {
    return `${value.toFixed(2)}%`;
}

function formatCombinedCurrency(usdtAmount, phpRate) {
    const phpAmount = usdtAmount * phpRate;
    return `${usdtAmount.toFixed(2)} USDT (₱${phpAmount.toFixed(2)})`;
}

function playSound(type) {
    const winSound = document.getElementById('winSound');
    const lossSound = document.getElementById('lossSound');
    if (type === 'win') {
        if (winSound) winSound.play().catch(e => console.error("Error playing win sound:", e));
    } else if (type === 'loss') {
        if (lossSound) lossSound.play().catch(e => console.error("Error playing loss sound:", e));
    }
}

function toggleProjectionInputs(method) {
    const percentInputs = document.getElementById('percentProjectionInputs');
    const fixedRoiInputs = document.getElementById('fixedRoiProjectionInputs');

    if (method === 'percent') {
        percentInputs.style.display = 'block';
        fixedRoiInputs.style.display = 'none';
    } else if (method === 'fixedRoi') {
        percentInputs.style.display = 'none';
        fixedRoiInputs.style.display = 'block';
    } else {
        percentInputs.style.display = 'none';
        fixedRoiInputs.style.display = 'none';
    }
}

// --- Local Storage Management ---

function saveState() {
    localStorage.setItem('tradeHistory', JSON.stringify(tradeHistory));
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
    localStorage.setItem('balanceData', JSON.stringify(balanceData));
    localStorage.setItem('lastTradeStats', JSON.stringify(lastTradeStats));
    localStorage.setItem('discrepancyHistory', JSON.stringify(discrepancyHistory));
    localStorage.setItem('cumulativeBalanceHistory', JSON.stringify(cumulativeBalanceHistory));
    localStorage.setItem('projectedGrowthHistory', JSON.stringify(projectedGrowthHistory));
}

function loadState() {
    // Start with default settings, then overwrite with any saved data
    appSettings = { ...DEFAULT_APP_SETTINGS };

    const savedTradeHistory = localStorage.getItem('tradeHistory');
    const savedAppSettings = localStorage.getItem('appSettings');
    const savedBalanceData = localStorage.getItem('balanceData');
    const savedLastTradeStats = localStorage.getItem('lastTradeStats');
    const savedDiscrepancyHistory = localStorage.getItem('discrepancyHistory');
    const savedCumulativeBalanceHistory = localStorage.getItem('cumulativeBalanceHistory');
    const savedProjectedGrowthHistory = localStorage.getItem('projectedGrowthHistory');

    if (savedTradeHistory) tradeHistory = JSON.parse(savedTradeHistory);
    if (savedAppSettings) Object.assign(appSettings, JSON.parse(savedAppSettings));
    if (savedBalanceData) Object.assign(balanceData, JSON.parse(savedBalanceData));
    if (savedLastTradeStats) Object.assign(lastTradeStats, JSON.parse(savedLastTradeStats));
    if (savedDiscrepancyHistory) discrepancyHistory = JSON.parse(savedDiscrepancyHistory);
    if (savedCumulativeBalanceHistory) cumulativeBalanceHistory = JSON.parse(savedCumulativeBalanceHistory);
    if (savedProjectedGrowthHistory) projectedGrowthHistory = JSON.parse(savedProjectedGrowthHistory);

    // Update UI from loaded settings
    document.getElementById('usdtPhpRate').value = appSettings.usdtPhpRate;
    document.getElementById('targetMonthlyIncomePhp').value = appSettings.targetMonthlyIncomePhp;
    document.getElementById('startingBalanceUsdt').value = appSettings.startingBalanceUsdt;
    document.getElementById('projectedGainPerTradeInput').value = appSettings.projectedGainPerTrade;
    document.getElementById('tradesPerDayInput').value = appSettings.tradesPerDay;
    document.getElementById('projectionPeriodDaysInput').value = appSettings.projectionPeriodDays;
    document.getElementById('projectedTradeAmountInput').value = appSettings.projectedTradeAmount;
    document.getElementById('projectedRoiPerTradeInput').value = appSettings.projectedRoiPerTrade;
    document.getElementById('targetTradingVolumeInput').value = appSettings.targetTradingVolume;
    document.getElementById('actualCurrentBalanceUsdtInput').value = balanceData.actualBalanceUsdt;
    document.getElementById('schedulePlannerInput').value = appSettings.schedulePlanner;
    document.documentElement.setAttribute('data-theme', appSettings.theme);

    const selectedRadio = document.querySelector(`input[name="projectionMethod"][value="${appSettings.selectedProjectionMethod}"]`);
    if (selectedRadio) {
        selectedRadio.checked = true;
    }
    toggleProjectionInputs(appSettings.selectedProjectionMethod);
}

// --- Data Calculation & Update ---

function updateAllMetrics() {
    const usdtPhpRate = parseFloat(document.getElementById('usdtPhpRate').value);
    const targetMonthlyIncomePhp = parseFloat(document.getElementById('targetMonthlyIncomePhp').value);
    const startingBalanceUsdt = parseFloat(document.getElementById('startingBalanceUsdt').value);
    const projectedGainPerTrade = parseFloat(document.getElementById('projectedGainPerTradeInput').value);
    const tradesPerDay = parseInt(document.getElementById('tradesPerDayInput').value);
    const projectionPeriodDays = parseInt(document.getElementById('projectionPeriodDaysInput').value);
    const projectedTradeAmount = parseFloat(document.getElementById('projectedTradeAmountInput').value);
    const projectedRoiPerTrade = parseFloat(document.getElementById('projectedRoiPerTradeInput').value);
    const targetTradingVolume = parseFloat(document.getElementById('targetTradingVolumeInput').value);
    const actualBalanceUsdt = parseFloat(document.getElementById('actualCurrentBalanceUsdtInput').value);

    if (isNaN(usdtPhpRate) || isNaN(targetMonthlyIncomePhp) || isNaN(startingBalanceUsdt) || isNaN(projectedGainPerTrade) || isNaN(tradesPerDay) || isNaN(projectionPeriodDays) || isNaN(projectedTradeAmount) || isNaN(projectedRoiPerTrade) || isNaN(targetTradingVolume) || isNaN(actualBalanceUsdt)) {
        console.warn("Invalid numerical input. Please check all input fields.");
        return;
    }

    // Recalculate cumulative balance history
    cumulativeBalanceHistory = [];
    let runningBalance = startingBalanceUsdt;
    if (tradeHistory.length > 0) {
        cumulativeBalanceHistory.push({ time: new Date(new Date(tradeHistory[0].time).getTime() - 1).toISOString(), balance: startingBalanceUsdt });
        tradeHistory.forEach(trade => {
            runningBalance += (trade.pnl || 0);
            cumulativeBalanceHistory.push({ time: trade.time, balance: runningBalance });
        });
    } else {
        cumulativeBalanceHistory.push({ time: new Date().toISOString(), balance: startingBalanceUsdt });
    }
    
    // Recalculate projected growth history
    projectedGrowthHistory = [];
    let currentProjectedBalanceForChart = runningBalance; // Start projection from the last known balance
    const selectedMethod = appSettings.selectedProjectionMethod;
    let dailyCompoundingFactor = 1;
    let dailyPnlFixedRoi = 0;

    if (selectedMethod === 'percent') {
        dailyCompoundingFactor = (1 + (projectedGainPerTrade / 100)) ** tradesPerDay;
    } else if (selectedMethod === 'fixedRoi') {
        dailyPnlFixedRoi = (projectedTradeAmount * (projectedRoiPerTrade / 100)) * tradesPerDay;
    }

    let projectionStartDate = new Date();
    if (tradeHistory.length > 0) {
        projectionStartDate = new Date(tradeHistory[tradeHistory.length - 1].time);
    }
    
    // Add current balance as the starting point for the projection line
    projectedGrowthHistory.push({ time: projectionStartDate.toISOString(), balance: currentProjectedBalanceForChart });

    for (let i = 1; i <= projectionPeriodDays; i++) {
        const projectDate = new Date(projectionStartDate);
        projectDate.setDate(projectionStartDate.getDate() + i);
        
        if (selectedMethod === 'percent') {
            currentProjectedBalanceForChart *= dailyCompoundingFactor;
        } else if (selectedMethod === 'fixedRoi') {
            currentProjectedBalanceForChart += dailyPnlFixedRoi;
        }
        projectedGrowthHistory.push({ time: projectDate.toISOString(), balance: currentProjectedBalanceForChart });
    }

    let totalPnLFromTrades = tradeHistory.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    balanceData.calculatedBalanceUsdt = startingBalanceUsdt + totalPnLFromTrades;

    if (tradeHistory.length >= 1) {
        const pnlBeforeLastTrade = tradeHistory.slice(0, -1).reduce((sum, trade) => sum + (trade.pnl || 0), 0);
        balanceData.previousBalanceUsdt = startingBalanceUsdt + pnlBeforeLastTrade;
    } else {
        balanceData.previousBalanceUsdt = startingBalanceUsdt;
    }
    
    const lastTrade = tradeHistory.length > 0 ? tradeHistory[tradeHistory.length - 1] : null;
    if (lastTrade) {
        lastTradeStats.currentGainUsdt = lastTrade.pnl || 0;
        lastTradeStats.currentRoi = lastTrade.roi || 0;
        lastTradeStats.lastTradeAmount = lastTrade.effectiveVolume || 0;

        if (tradeHistory.length >= 2) {
            lastTradeStats.previousGainUsdt = tradeHistory[tradeHistory.length - 2].pnl || 0;
            lastTradeStats.previousTradeAmount = tradeHistory[tradeHistory.length - 2].effectiveVolume || 0;
        } else {
            lastTradeStats.previousGainUsdt = 0;
            lastTradeStats.previousTradeAmount = 0;
        }
    } else {
        lastTradeStats = { ...DEFAULT_LAST_TRADE_STATS };
    }

    const totalGainsUsdt = balanceData.calculatedBalanceUsdt - startingBalanceUsdt;
    const targetMonthlyIncomeUsdt = targetMonthlyIncomePhp / usdtPhpRate;
    const targetBalanceUsdt = startingBalanceUsdt + targetMonthlyIncomeUsdt;
    const walletBalanceNeeded = targetBalanceUsdt - balanceData.calculatedBalanceUsdt;

    // Days Remaining (Linear)
    const dailyTargetIncomeUsdt = (targetMonthlyIncomeUsdt / 30);
    const remainingToTargetUsdtLinear = Math.max(0, targetBalanceUsdt - balanceData.calculatedBalanceUsdt);
    const daysRemainingLinear = dailyTargetIncomeUsdt > 0 ? remainingToTargetUsdtLinear / dailyTargetIncomeUsdt : Infinity;

    // Days Remaining (Compounding)
    let daysRemainingCompounding = 'N/A';
    if (balanceData.calculatedBalanceUsdt > 0 && targetBalanceUsdt > balanceData.calculatedBalanceUsdt) {
        if (selectedMethod === 'percent' && dailyCompoundingFactor > 1) {
            daysRemainingCompounding = Math.log(targetBalanceUsdt / balanceData.calculatedBalanceUsdt) / Math.log(dailyCompoundingFactor);
        } else if (selectedMethod === 'fixedRoi' && dailyPnlFixedRoi > 0) {
            daysRemainingCompounding = (targetBalanceUsdt - balanceData.calculatedBalanceUsdt) / dailyPnlFixedRoi;
        } else {
            daysRemainingCompounding = Infinity;
        }
    } else if (balanceData.calculatedBalanceUsdt >= targetBalanceUsdt) {
        daysRemainingCompounding = 0;
    }

    // Days Remaining (Volume)
    const currentTotalTradingVolume = tradeHistory.reduce((sum, trade) => sum + (trade.effectiveVolume || 0), 0);
    const remainingVolumeNeeded = Math.max(0, targetTradingVolume - currentTotalTradingVolume);
    const projectedDailyTradingVolume = projectedTradeAmount * tradesPerDay;
    let daysRemainingVolumeTarget = 'N/A';
    if (targetTradingVolume > 0 && remainingVolumeNeeded > 0 && projectedDailyTradingVolume > 0) {
        daysRemainingVolumeTarget = remainingVolumeNeeded / projectedDailyTradingVolume;
    } else if (remainingVolumeNeeded <= 0) {
        daysRemainingVolumeTarget = 0;
    }
    
    // Update UI elements
    document.getElementById('targetBalanceCombined').textContent = formatCombinedCurrency(targetBalanceUsdt, usdtPhpRate);
    document.getElementById('totalGainsCombined').textContent = formatCombinedCurrency(totalGainsUsdt, usdtPhpRate);
    document.getElementById('totalGainsCombined').className = `value ${totalGainsUsdt >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('daysRemainingLinear').textContent = isFinite(daysRemainingLinear) ? daysRemainingLinear.toFixed(2) + ' days' : 'N/A';
    document.getElementById('daysRemainingCompounding').textContent = (typeof daysRemainingCompounding === 'number' && isFinite(daysRemainingCompounding)) ? daysRemainingCompounding.toFixed(2) + ' days' : 'N/A';
    
    document.getElementById('currentTotalTradingVolume').textContent = formatCurrency(currentTotalTradingVolume);
    document.getElementById('daysRemainingVolumeTarget').textContent = (typeof daysRemainingVolumeTarget === 'number' && isFinite(daysRemainingVolumeTarget)) ? daysRemainingVolumeTarget.toFixed(2) + ' days' : 'N/A';

    document.getElementById('walletBalanceNeededCombined').textContent = formatCombinedCurrency(walletBalanceNeeded, usdtPhpRate);
    document.getElementById('walletBalanceNeededCombined').className = `value ${walletBalanceNeeded <= 0 ? 'positive' : 'negative'}`;

    document.getElementById('previousBalanceCombined').textContent = formatCombinedCurrency(balanceData.previousBalanceUsdt, usdtPhpRate);
    document.getElementById('calculatedBalanceCombined').textContent = formatCombinedCurrency(balanceData.calculatedBalanceUsdt, usdtPhpRate);

    const discrepancyUsdt = actualBalanceUsdt - balanceData.calculatedBalanceUsdt;
    document.getElementById('discrepancyCombined').textContent = formatCombinedCurrency(discrepancyUsdt, usdtPhpRate);
    document.getElementById('discrepancyCombined').className = `value ${discrepancyUsdt >= 0 ? 'positive' : 'negative'}`;
    
    balanceData.actualBalanceUsdt = actualBalanceUsdt;

    if (!isNaN(discrepancyUsdt) && actualBalanceUsdt !== 0) {
        discrepancyHistory.push({ time: new Date().toISOString(), value: discrepancyUsdt });
    }

    const gainDifferenceUsdt = lastTradeStats.currentGainUsdt - lastTradeStats.previousGainUsdt;
    const gainDifferencePhp = gainDifferenceUsdt * usdtPhpRate;
    const tradeAmountGrowth = lastTradeStats.lastTradeAmount - lastTradeStats.previousTradeAmount;

    document.getElementById('currentGainUsdt').textContent = formatCurrency(lastTradeStats.currentGainUsdt);
    document.getElementById('currentGainUsdt').className = `value ${lastTradeStats.currentGainUsdt >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('currentGainPhp').textContent = formatPhp(lastTradeStats.currentGainUsdt * usdtPhpRate);
    document.getElementById('currentGainPhp').className = `value ${lastTradeStats.currentGainUsdt * usdtPhpRate >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('currentRoi').textContent = formatDecimalPercentage(lastTradeStats.currentRoi);
    document.getElementById('currentRoi').className = `value ${lastTradeStats.currentRoi >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('previousGainUsdt').textContent = formatCurrency(lastTradeStats.previousGainUsdt);
    document.getElementById('gainDifferenceUsdt').textContent = formatCurrency(gainDifferenceUsdt);
    document.getElementById('gainDifferencePhp').textContent = formatPhp(gainDifferencePhp);
    document.getElementById('lastTradeAmountUsdt').textContent = formatCurrency(lastTradeStats.lastTradeAmount);
    document.getElementById('tradeAmountGrowth').textContent = formatCurrency(tradeAmountGrowth);
    document.getElementById('tradeAmountGrowth').className = `value ${tradeAmountGrowth >= 0 ? 'positive' : 'negative'}`;
    
    // Streak Analytics
    let currentWin = 0, longestWin = 0, currentLoss = 0, longestLoss = 0, wins = 0, losses = 0;
    tradeHistory.forEach(trade => {
        if ((trade.pnl || 0) >= 0) {
            currentWin++;
            longestWin = Math.max(longestWin, currentWin);
            currentLoss = 0;
            wins++;
        } else {
            currentLoss++;
            longestLoss = Math.max(longestLoss, currentLoss);
            currentWin = 0;
            losses++;
        }
    });
    document.getElementById('currentWinStreak').textContent = currentWin;
    document.getElementById('longestWinStreak').textContent = longestWin;
    document.getElementById('currentLossStreak').textContent = currentLoss;
    document.getElementById('longestLossStreak').textContent = longestLoss;
    document.getElementById('totalTrades').textContent = tradeHistory.length;
    document.getElementById('totalWins').textContent = wins;
    document.getElementById('totalLosses').textContent = losses;
    document.getElementById('winRate').textContent = tradeHistory.length > 0 ? formatPercentage((wins / tradeHistory.length) * 100) : '0%';

    updateCharts();
    saveState();
}

// --- Chart Functions ---
function initializeCharts() {
    const commonLineOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { beginAtZero: false, ticks: { callback: value => value.toFixed(2) + ' USDT' } }, x: { title: { display: true } } },
        plugins: { tooltip: { callbacks: { label: context => `${context.dataset.label}: ${context.parsed.y.toFixed(2)} USDT` } } }
    };
    
    monthlyPnLChart = new Chart('monthlyPnLChart', { type: 'line', data: { datasets: [{ label: 'Monthly PNL (USDT)', tension: 0.1, fill: false }] }, options: { ...commonLineOptions, scales: { ...commonLineOptions.scales, x: { ...commonLineOptions.scales.x, title: { ...commonLineOptions.scales.x.title, text: 'Month' } } } } });
    monthlyVolumeChart = new Chart('monthlyVolumeChart', { type: 'bar', data: { datasets: [{ label: 'Monthly Trade Volume (USDT)' }] }, options: { ...commonLineOptions, scales: { ...commonLineOptions.scales, x: { ...commonLineOptions.scales.x, title: { ...commonLineOptions.scales.x.title, text: 'Month' } } } } });
    dailyRoiChart = new Chart('dailyRoiChart', { type: 'line', data: { datasets: [{ label: 'Daily ROI (%)', borderColor: 'rgb(255, 159, 64)', tension: 0.1 }] }, options: { ...commonLineOptions, scales: { y: { ticks: { callback: value => value.toFixed(2) + ' %' } }, x: { ...commonLineOptions.scales.x, title: { ...commonLineOptions.scales.x.title, text: 'Date' } } } } });
    dailyPnLChart = new Chart('dailyPnLChart', { type: 'bar', data: { datasets: [{ label: 'Daily PNL (USDT)' }] }, options: { ...commonLineOptions, scales: { ...commonLineOptions.scales, x: { ...commonLineOptions.scales.x, title: { ...commonLineOptions.scales.x.title, text: 'Date' } } } } });
    dailyVolumeChart = new Chart('dailyVolumeChart', { type: 'line', data: { datasets: [{ label: 'Daily Trade Volume (USDT)', borderColor: 'rgb(54, 162, 235)', tension: 0.1 }] }, options: { ...commonLineOptions, scales: { ...commonLineOptions.scales, x: { ...commonLineOptions.scales.x, title: { ...commonLineOptions.scales.x.title, text: 'Date' } } } } });
    discrepancyChart = new Chart('discrepancyChart', { type: 'line', data: { datasets: [{ label: 'Balance Discrepancy (USDT)', borderColor: 'rgb(255, 99, 132)', tension: 0.1 }] }, options: { ...commonLineOptions, scales: { ...commonLineOptions.scales, x: { ...commonLineOptions.scales.x, title: { ...commonLineOptions.scales.x.title, text: 'Time of Update' } } } } });
    cumulativeBalanceChart = new Chart('cumulativeBalanceChart', { type: 'line', data: { datasets: [{ label: 'Cumulative Balance (USDT)', tension: 0.1, fill: true, backgroundColor: 'rgba(75, 192, 192, 0.2)' }] }, options: { ...commonLineOptions, scales: { ...commonLineOptions.scales, x: { ...commonLineOptions.scales.x, title: { ...commonLineOptions.scales.x.title, text: 'Time' } } } } });
    projectedGrowthChart = new Chart('projectedGrowthChart', {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Projected Balance', data: [], borderColor: 'rgb(0, 123, 255)', borderDash: [5, 5], tension: 0.1, pointRadius: 0 },
                { label: 'Actual Cumulative Balance', data: [], borderColor: 'rgb(40, 167, 69)', tension: 0.1, pointRadius: 3 }
            ]
        },
        options: { ...commonLineOptions, scales: { ...commonLineOptions.scales, x: { ...commonLineOptions.scales.x, title: { ...commonLineOptions.scales.x.title, text: 'Date' } } } }
    });
}

function updateCharts() {
    // Data aggregation
    const monthlyData = {};
    const dailyData = {};
    tradeHistory.forEach(trade => {
        const tradeDate = new Date(trade.time);
        if (isNaN(tradeDate.getTime())) return;
        
        const yearMonth = `${tradeDate.getFullYear()}-${(tradeDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const fullDate = `${yearMonth}-${tradeDate.getDate().toString().padStart(2, '0')}`;

        monthlyData[yearMonth] = monthlyData[yearMonth] || { pnl: 0, volume: 0 };
        monthlyData[yearMonth].pnl += (trade.pnl || 0);
        monthlyData[yearMonth].volume += (trade.effectiveVolume || 0);

        dailyData[fullDate] = dailyData[fullDate] || { pnl: 0, volume: 0, roiSum: 0, roiCount: 0 };
        dailyData[fullDate].pnl += (trade.pnl || 0);
        dailyData[fullDate].volume += (trade.effectiveVolume || 0);
        dailyData[fullDate].roiSum += (trade.roi || 0);
        dailyData[fullDate].roiCount++;
    });

    // Monthly charts
    const sortedMonths = Object.keys(monthlyData).sort();
    monthlyPnLChart.data.labels = sortedMonths;
    monthlyPnLChart.data.datasets[0].data = sortedMonths.map(m => monthlyData[m].pnl);
    monthlyVolumeChart.data.labels = sortedMonths;
    monthlyVolumeChart.data.datasets[0].data = sortedMonths.map(m => monthlyData[m].volume);

    // Daily charts
    const sortedDates = Object.keys(dailyData).sort();
    dailyPnLChart.data.labels = sortedDates;
    dailyPnLChart.data.datasets[0].data = sortedDates.map(d => dailyData[d].pnl);
    dailyVolumeChart.data.labels = sortedDates;
    dailyVolumeChart.data.datasets[0].data = sortedDates.map(d => dailyData[d].volume);
    dailyRoiChart.data.labels = sortedDates;
    dailyRoiChart.data.datasets[0].data = sortedDates.map(d => dailyData[d].roiCount > 0 ? dailyData[d].roiSum / dailyData[d].roiCount : 0);

    // Discrepancy chart
    discrepancyChart.data.labels = discrepancyHistory.map(e => new Date(e.time).toLocaleString());
    discrepancyChart.data.datasets[0].data = discrepancyHistory.map(e => e.value);

    // Cumulative and Projected charts
    const combinedLabels = [...new Set([...cumulativeBalanceHistory.map(e => e.time.split('T')[0]), ...projectedGrowthHistory.map(e => e.time.split('T')[0])])].sort();
    projectedGrowthChart.data.labels = combinedLabels;
    projectedGrowthChart.data.datasets[0].data = combinedLabels.map(date => {
        const entry = projectedGrowthHistory.find(e => e.time.startsWith(date));
        return entry ? entry.balance : null;
    });
    projectedGrowthChart.data.datasets[1].data = combinedLabels.map(date => {
        const entry = cumulativeBalanceHistory.find(e => e.time.startsWith(date));
        return entry ? entry.balance : null;
    });
    cumulativeBalanceChart.data.labels = cumulativeBalanceHistory.map(e => new Date(e.time).toLocaleString());
    cumulativeBalanceChart.data.datasets[0].data = cumulativeBalanceHistory.map(e => e.balance);

    // Update all charts
    [monthlyPnLChart, monthlyVolumeChart, dailyPnLChart, dailyVolumeChart, dailyRoiChart, discrepancyChart, cumulativeBalanceChart, projectedGrowthChart].forEach(chart => chart.update());
}


// --- Data Parsing ---
function displayTrades(trades) {
    const tradeHistoryOutput = document.getElementById('tradeHistoryOutput');
    tradeHistoryOutput.innerHTML = '';
    if (trades.length === 0) {
        tradeHistoryOutput.innerHTML = '<p>No trade data processed yet.</p>';
        return;
    }
    [...trades].sort((a, b) => new Date(b.time) - new Date(a.time)).forEach(trade => {
        const tradeDiv = document.createElement('div');
        tradeDiv.classList.add('trade-entry');
        tradeDiv.innerHTML = `
            <div class="card-row"><strong>Pair:</strong><span>${trade.pair || 'N/A'}</span></div>
            <div class="card-row"><strong>Time:</strong><span>${trade.time || 'N/A'}</span></div>
            <div class="card-row"><strong>PNL:</strong><span class="${(trade.pnl || 0) >= 0 ? 'positive' : 'negative'}">${formatCurrency(trade.pnl || 0)}</span></div>
            <div class="card-row"><strong>ROI:</strong><span class="${(trade.pnl || 0) >= 0 ? 'positive' : 'negative'}">${formatDecimalPercentage(trade.roi || 0)}</span></div>
        `;
        tradeHistoryOutput.appendChild(tradeDiv);
    });
}

function parseTradeData(rawData) {
    const patterns = {
        pair: /^([A-Z]{2,5}\/[A-Z]{2,5})$/,
        orderNo: /^Order No\.\s*(\d+)$/,
        time: /^Time\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})$/,
        pnl: /^PNL\s*([+-]?[\d.]+)\s*USDT$/,
        roi: /^ROI\s*≈?\s*([\d.]+)\s*%$/,
        effectiveVolume: /^Effective trading volume\s*([\d.]+)\s*USDT$/
    };
    const tradeBlocks = rawData.replace(/\r\n/g, '\n').split(/\n\n+/);
    const parsedTrades = [];

    tradeBlocks.forEach(block => {
        const trade = {};
        const lines = block.split('\n').map(cleanLine).filter(Boolean);
        lines.forEach(line => {
            for (const key in patterns) {
                const match = line.match(patterns[key]);
                if (match) {
                    trade[key] = key.match(/pnl|roi|effectiveVolume/) ? parseFloat(match[1]) : match[1];
                    return;
                }
            }
        });
        if (trade.pair && trade.time && trade.orderNo && !isNaN(trade.pnl)) {
            parsedTrades.push(trade);
        }
    });
    return parsedTrades;
}

function handleNewParsedTrades(newTrades) {
    const existingOrderNos = new Set(tradeHistory.map(t => t.orderNo));
    const uniqueNewTrades = newTrades.filter(t => !existingOrderNos.has(t.orderNo));

    if (uniqueNewTrades.length > 0) {
        const lastNewTrade = uniqueNewTrades[uniqueNewTrades.length - 1];
        if(lastNewTrade.pnl > 0) playSound('win');
        if(lastNewTrade.pnl < 0) playSound('loss');

        tradeHistory.push(...uniqueNewTrades);
        tradeHistory.sort((a, b) => new Date(a.time) - new Date(b.time));
        
        document.getElementById('tradeDataInput').value = '';
        displayTrades(tradeHistory);
        updateAllMetrics();
    } else {
        alert("No new trades found. The pasted data might be duplicates.");
    }
}


// --- Setup Modal & Reset ---
function showSetupModal() {
    document.getElementById('setupModalOverlay').classList.add('visible');
    updateSetupModalContent();
}

function hideSetupModal() {
    document.getElementById('setupModalOverlay').classList.remove('visible');
    localStorage.setItem('hasSeenSetup', 'true');
}

function updateSetupModalContent() {
    const step = setupSteps[currentSetupStep];
    document.getElementById('setupModalTitle').textContent = step.title;
    document.getElementById('setupModalBody').innerHTML = step.body;
    document.getElementById('currentStepNumber').textContent = currentSetupStep + 1;
    document.getElementById('totalStepsNumber').textContent = setupSteps.length;
    document.getElementById('setupPrevButton').disabled = currentSetupStep === 0;
    document.getElementById('setupNextButton').style.display = currentSetupStep === setupSteps.length - 1 ? 'none' : 'inline-block';
    document.getElementById('setupStartButton').style.display = currentSetupStep === setupSteps.length - 1 ? 'inline-block' : 'none';
}

function resetAllData() {
    if (confirm("Are you sure you want to reset ALL your saved data? This action cannot be undone.")) {
        localStorage.clear();
        tradeHistory = [];
        appSettings = { ...DEFAULT_APP_SETTINGS };
        balanceData = { ...DEFAULT_BALANCE_DATA };
        lastTradeStats = { ...DEFAULT_LAST_TRADE_STATS };
        discrepancyHistory = [];
        cumulativeBalanceHistory = [];
        projectedGrowthHistory = [];
        
        loadState();
        displayTrades(tradeHistory);
        updateAllMetrics();
        
        currentSetupStep = 0;
        showSetupModal();
        alert("All data has been reset.");
    }
}


// --- Main DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Assign Event Listeners ---
    const inputsToUpdate = [
        'usdtPhpRate', 'targetMonthlyIncomePhp', 'startingBalanceUsdt', 'projectedGainPerTradeInput',
        'tradesPerDayInput', 'projectionPeriodDaysInput', 'projectedTradeAmountInput', 'projectedRoiPerTradeInput',
        'targetTradingVolumeInput', 'actualCurrentBalanceUsdtInput'
    ];
    inputsToUpdate.forEach(id => {
        document.getElementById(id).addEventListener('input', updateAllMetrics);
    });

    document.getElementById('schedulePlannerInput').addEventListener('input', (e) => {
        appSettings.schedulePlanner = e.target.value;
        saveState();
    });

    document.querySelectorAll('input[name="projectionMethod"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            appSettings.selectedProjectionMethod = event.target.value;
            toggleProjectionInputs(event.target.value);
            updateAllMetrics();
        });
    });

    document.getElementById('processDataButton').addEventListener('click', () => {
        const rawData = document.getElementById('tradeDataInput').value;
        if (rawData.trim()) {
            handleNewParsedTrades(parseTradeData(rawData));
        } else {
            alert('Please paste trade data into the text area.');
        }
    });

    document.getElementById('themeToggle').addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        appSettings.theme = newTheme;
        saveState();
    });
    
    document.getElementById('resetDataButtonBottom').addEventListener('click', resetAllData);
    
    // Modal Navigation
    document.getElementById('setupNextButton').addEventListener('click', () => {
        if (currentSetupStep < setupSteps.length - 1) {
            currentSetupStep++;
            updateSetupModalContent();
        }
    });
    document.getElementById('setupPrevButton').addEventListener('click', () => {
        if (currentSetupStep > 0) {
            currentSetupStep--;
            updateSetupModalContent();
        }
    });
    document.getElementById('setupStartButton').addEventListener('click', hideSetupModal);


    // --- Initial Load Sequence ---
    loadState();
    initializeCharts();
    updateAllMetrics();
    displayTrades(tradeHistory);

    if (!localStorage.getItem('hasSeenSetup')) {
        currentSetupStep = 0;
        showSetupModal();
    }

    // --- Enable Draggable Cards ---
    const cardContainer = document.querySelector('.container');
    new Sortable(cardContainer, {
        animation: 150, // Smooth transition animation
        handle: '.card h2, .card h3', // Use the card title as the drag handle
        filter: '#processedHistoryCard', // Prevent the full-width history card from being dragged
        onEnd: function (evt) {
            // Optional: You could save the card order to localStorage here if you want it to persist
        }
    });
});