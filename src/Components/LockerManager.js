// ⭐️ 1. React ต้องมาก่อนเสมอ
import React, { useState, useEffect } from 'react';

// ⭐️ 2. Import CSS
import './Locker.css'; 

// ⭐️ 3. Import Firebase (จากไฟล์ของคุณ)
// (เอา 'remove' ออกจากตรงนี้แล้ว)
import { 
    db, 
    ref, 
    onValue, 
    set, 
    push, 
    serverTimestamp 
} from '../Firebase/Firebase'; 

// ⭐️ 4. Import ฟังก์ชัน query (จาก 'firebase/database' โดยตรง)
// (แก้ไข limitTolast เป็น limitToLast)
import { 
    query, 
    orderByChild, 
    limitToLast,
    update
} from 'firebase/database';


const ALL_LOCKERS = ["Locker_A01", "Locker_A02", "Locker_A03", "Locker_A04", "Locker_B01", "Locker_B02", "Locker_B03", "Locker_B04"];

// -----------------------------------------------------------------
// ⭐️ ส่วนที่ 1: Component ฟอร์ม Login (เหมือนเดิม)
// -----------------------------------------------------------------
function AdminLoginForm({ onLogin, onCancel }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <div className="login-modal-overlay"> 
            <form className="login-form" onSubmit={handleSubmit}>
                <h2>Admin Login</h2>
                <div className="form-group">
                    <label>Username:</label>
                    <input 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Password:</label>
                    <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="btn-login">Login</button>
                <button type="button" className="btn-cancel-login" onClick={onCancel}>
                    ยกเลิก
                </button>
            </form>
        </div>
    );
}

// -----------------------------------------------------------------
// ⭐️ ส่วนที่ 2: Component ประวัติ (History Modal) (แก้ไขกลับ)
// -----------------------------------------------------------------

// ฟังก์ชันแปลงเวลา (เหมือนเดิม)
function formatThaiTime(timestamp) {
    const date = new Date(timestamp);
    const options = {
        year: 'numeric', month: 'long', day: 'numeric',
        weekday: 'long', hour: '2-digit', minute: '2-digit',
        second: '2-digit', timeZone: 'Asia/Bangkok'
    };
    return date.toLocaleString('th-TH', options);
}

function HistoryModal({ onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const historyRef = ref(db, 'history');
        
        // ⭐️⭐️⭐️ แก้ไข: กลับไปใช้ limitToLast(50) เพื่อดึงแค่ 50 รายการ
        const historyQuery = query(historyRef, orderByChild('timestamp'), limitToLast(50));

        const unsubscribe = onValue(historyQuery, (snapshot) => {
            const data = snapshot.val();
            const loadedLogs = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    loadedLogs.push({ id: key, ...data[key] });
                });
                // เรียงลำดับจากใหม่ไปเก่า
                loadedLogs.sort((a, b) => b.timestamp - a.timestamp);
            }
            setLogs(loadedLogs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []); 

    // ⭐️⭐️⭐️ ลบฟังก์ชัน handleClearHistory ออกไปแล้ว

    return (
        <div className="history-modal-overlay">
            <div className="history-container">
                {/* ⭐️⭐️⭐️ แก้ไข: เปลี่ยน H2 กลับเป็น 50 รายการล่าสุด */}
                <h2>ประวัติการใช้งาน (50 รายการล่าสุด)</h2> 
                
                {loading ? (
                    <p>กำลังโหลด...</p>
                ) : (
                    <ul className="history-list">
                        {logs.length === 0 ? (
                            <li className="history-item">ไม่มีข้อมูลประวัติ</li>
                        ) : (
                            logs.map(log => (
                                <li key={log.id} className="history-item">
                                    <strong>{formatThaiTime(log.timestamp)}</strong>
                                    <p>Locker: <strong>{log.lockerId}</strong> | การกระทำ: <strong>{log.action}</strong></p>
                                </li>
                            ))
                        )}
                    </ul>
                )}
                
                {/* ⭐️⭐️⭐️ แก้ไข: เหลือแค่ปุ่ม "ปิด" */}
                <div className="history-controls">
                    <button className="btn-close-history" onClick={onClose}>
                        ปิด
                    </button>
                </div>

            </div>
        </div>
    );
}


// -----------------------------------------------------------------
// ⭐️ ส่วนที่ 3: Component หลัก (LockerManager) (เหมือนเดิม)
// -----------------------------------------------------------------
function LockerManager({ onStartAction }) {
    const [lockerStatuses, setLockerStatuses] = useState({}); 
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [showHistory, setShowHistory] = useState(false); 

    useEffect(() => {
        const dbRef = ref(db, 'lockers');
        const unsubscribe = onValue(dbRef, (snapshot) => {
            const data = snapshot.val() || {};
            setLockerStatuses(data);
        });
        return () => unsubscribe(); 
    }, []);

    const getLockerStatus = (id) => lockerStatuses[id]?.status || 'AVAILABLE';

    const getStatusColor = (id) => {
        const status = getLockerStatus(id);
        if (status === 'OCCUPIED') return 'red';
        if (status === 'AVAILABLE') return 'green';
        return 'gray'; 
    };

    const logHistory = async (actionType, lockerId) => {
        try {
            const historyRef = ref(db, 'history');
            await push(historyRef, {
                action: actionType,
                lockerId: lockerId,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Failed to log history:", error);
        }
    };

    const handleSelectLocker = (lockerId, type) => {
        const status = getLockerStatus(lockerId);
        
        if (type === 'DEPOSIT' && status === 'OCCUPIED') {
            alert(`Locker ${lockerId} ไม่ว่าง! กรุณาเลือกล็อกเกอร์อื่น`);
            return;
        }
        if (type === 'WITHDRAW' && status === 'AVAILABLE') {
            alert(`Locker ${lockerId} ว่างอยู่! ไม่มีรองเท้าให้เอาออก`);
            return;
        }
        
        logHistory(type, lockerId); 
        onStartAction(lockerId, type);
    };

    const handleLogin = (username, password) => {
        if (username === 'admin' && password === '12345678') {
            setIsAdminLoggedIn(true);
            setShowAdminLogin(false); 
        } else {
            alert('Username หรือ Password ไม่ถูกต้อง');
        }
    };

    const handleLogout = () => {
        setIsAdminLoggedIn(false);
    };

    const handleAdminToggleLocker = async (lockerId) => {
        const currentStatus = getLockerStatus(lockerId);
        const newStatus = currentStatus === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';
        const newRelayCommand = (newStatus === 'OCCUPIED') ? 1 : 0;
        const payload = {
            relay_command: newRelayCommand,
            status: newStatus
        }

        if (newStatus === 'AVAILABLE') {
            payload.withdrawal_time = serverTimestamp()
        }
        
        try {
            const lockerRef = ref(db, `lockers/${lockerId}`);
            await update(lockerRef, payload);
            logHistory('ADMIN_TOGGLE', lockerId);
            alert(`Admin: เปลี่ยนสถานะ ${lockerId} เป็น ${newStatus} สำเร็จ`);
        } catch (error) {
            console.error("Admin Toggle Error: ", error);
            alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
        }
    };

    return (
        <div className="locker-manager-container"> 
            
            <div className="admin-nav-buttons">
                {isAdminLoggedIn ? (
                    <>
                        <button 
                            onClick={() => setShowHistory(true)} 
                            className="btn-admin-login-toggle btn-view-history"
                        >
                            ดูประวัติ
                        </button>
                        <button onClick={handleLogout} className="btn-admin-login-toggle btn-logout">
                            Logout Admin
                        </button>
                    </>
                ) : (
                    <button onClick={() => setShowAdminLogin(true)} className="btn-admin-login-toggle btn-login-nav">
                        Admin Login
                    </button>
                )}
            </div>

            {showAdminLogin && !isAdminLoggedIn && (
                <AdminLoginForm 
                    onLogin={handleLogin}
                    onCancel={() => setShowAdminLogin(false)} 
                />
            )}

            {showHistory && isAdminLoggedIn && (
                <HistoryModal onClose={() => setShowHistory(false)} />
            )}


            <h2>เลือกล็อกเกอร์และดำเนินการ</h2>
            <div className="lockers-grid">
                {ALL_LOCKERS.map((id) => {
                    const status = getLockerStatus(id);
                    const isOccupied = status === 'OCCUPIED';

                    return (
                        <div 
                            key={id} 
                            className="locker-card" 
                            style={{ border: `2px solid ${getStatusColor(id)}` }}
                        >
                            <strong>{id}</strong>
                            <p 
                                className="status-text"
                                style={{ color: getStatusColor(id) }}
                            >
                                {status}
                            </p>
                            
                            
                            <button 
                                onClick={() => handleSelectLocker(id, 'DEPOSIT')}
                                disabled={isOccupied} 
                                className="btn-deposit"
                            >
                                เก็บ (Deposit)
                            </button>
                            <button 
                                onClick={() => handleSelectLocker(id, 'WITHDRAW')}
                                disabled={!isOccupied}
                                className="btn-withdraw"
                            >
                                นำออก (Withdraw)
                            </button>

                            {isAdminLoggedIn && (
                                <button
                                    onClick={() => handleAdminToggleLocker(id)}
                                    className="btn-admin-toggle"
                                >
                                    สลับสถานะ (Admin)
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default LockerManager;