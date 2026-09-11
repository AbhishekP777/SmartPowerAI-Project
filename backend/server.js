require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Cloud Connected Successfully"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err.message));

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true },
    password: String, // Note: Unhashed for prototype simplicity
    account_id: String
});
const User = mongoose.model('User', userSchema);

const optimizationSchema = new mongoose.Schema({
    username: String,
    appliance: String,
    recommended_start_hour: Number,
    estimated_savings_rupees: Number,
    timestamp: { type: Date, default: Date.now }
});
const OptimizationHistory = mongoose.model('OptimizationHistory', optimizationSchema);

// --- ROUTES: AUTHENTICATION ---
app.post('/api/signup', async (req, res) => {
    try {
        const { name, username, password } = req.body;
        
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ success: false, error: "Username already exists." });

        const newUser = new User({
            name,
            username,
            password,
            account_id: `SP-${Math.floor(1000 + Math.random() * 9000)}` // Generate random account ID
        });
        await newUser.save();
        
        res.json({ success: true, user: { name: newUser.name, username: newUser.username, account_id: newUser.account_id }});
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error during registration." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        
        if (user) {
            res.json({ success: true, user: { name: user.name, username: user.username, account_id: user.account_id }});
        } else {
            res.status(401).json({ success: false, error: "Invalid username or password." });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error during login." });
    }
});


// --- ROUTES: CORE FEATURES ---
app.post('/api/dashboard', (req, res) => {
    // 1. Today's Hourly Breakdown WITH a simulated anomaly at 03:00 AM
    const todayHourly = [
        { time: '00:00', kwh: 0.4, expectedKwh: 0.5, isAnomaly: false }, 
        { time: '03:00', kwh: 4.5, expectedKwh: 0.3, isAnomaly: true }, // The hidden anomaly!
        { time: '06:00', kwh: 0.8, expectedKwh: 0.9, isAnomaly: false }, 
        { time: '09:00', kwh: 1.5, expectedKwh: 1.4, isAnomaly: false },
        { time: '12:00', kwh: 1.2, expectedKwh: 1.3, isAnomaly: false }, 
        { time: '15:00', kwh: 0.9, expectedKwh: 1.0, isAnomaly: false },
        { time: '18:00', kwh: 2.4, expectedKwh: 2.5, isAnomaly: false }, 
        { time: '21:00', kwh: 2.1, expectedKwh: 2.0, isAnomaly: false }
    ];
    
    const weeklyData = [
        { day: 'Mon', kwh: 14.2 }, { day: 'Tue', kwh: 12.8 }, { day: 'Wed', kwh: 15.1 },
        { day: 'Thu', kwh: 11.4 }, { day: 'Fri', kwh: 13.9 }, { day: 'Sat', kwh: 18.5 }, { day: 'Sun', kwh: 19.2 }
    ];

    const monthComparisonData = [
        { period: 'Day 1-5', thisMonth: 65, pastMonth: 72 }, { period: 'Day 6-10', thisMonth: 78, pastMonth: 70 },
        { period: 'Day 11-15', thisMonth: 82, pastMonth: 85 }, { period: 'Day 16-20', thisMonth: 90, pastMonth: 88 },
        { period: 'Day 21-25', thisMonth: 74, pastMonth: 92 }, { period: 'Day 26-30', thisMonth: 85, pastMonth: 95 }
    ];

    const applianceBreakdown = [
        { name: 'HVAC / Heating', value: 45, color: '#3f51b5' }, { name: 'Kitchen', value: 20, color: '#009688' },
        { name: 'Laundry', value: 15, color: '#ff9800' }, { name: 'Base Load', value: 20, color: '#9c27b0' }
    ];

    res.json({ 
        today: { totalKwh: 13.8, hourly: todayHourly },
        thisMonth: { totalKwh: 474, pastMonthKwh: 502 },
        billing: { currentBillInr: 3081, projectedBillInr: 3697, carbonKg: 336 },
        weekly_chart_data: weeklyData, 
        month_comparison_chart: monthComparisonData,
        appliance_breakdown: applianceBreakdown,
        insight: "Automated scan detected 1 critical anomaly at 03:00 hrs. Usage exceeded baseline by 1,400%." 
    });
});

app.post('/api/smart-optimize', async (req, res) => {
    try {
        const pythonResponse = await axios.post('http://127.0.0.1:8000/api/optimize', req.body);
        const aiData = pythonResponse.data;
        const newRecord = new OptimizationHistory({
            username: req.body.username, appliance: aiData.appliance,
            recommended_start_hour: aiData.recommended_start_hour, estimated_savings_rupees: aiData.estimated_savings_rupees
        });
        await newRecord.save();
        res.json(aiData);
    } catch (error) {
        res.status(500).json({ error: "ML Engine is offline." });
    }
});

app.get('/api/history/:username', async (req, res) => {
    try {
        const history = await OptimizationHistory.find({ username: req.params.username }).sort({ timestamp: -1 }).limit(5);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

app.listen(3000, () => console.log(`🚀 Node.js API Gateway running on port 3000`));