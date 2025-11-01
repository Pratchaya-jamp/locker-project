// src/App.js

import React, { useState } from 'react';
import './App.css';
// ตรวจสอบ Path ให้ตรงกับชื่อโฟลเดอร์จริง (เช่น /Components หรือ /components)
import LockerManager from './Components/LockerManager';
import QrScanner from './Components/QrScanner';
import DoorControl from './Components/DoorControl'; 

function App() {
    const [currentStep, setCurrentStep] = useState('MANAGER'); // 'MANAGER', 'SCANNER', 'CONTROL'
    const [activeLocker, setActiveLocker] = useState(null);
    const [activeAction, setActiveAction] = useState(null); // 'DEPOSIT' หรือ 'WITHDRAW'
    const [isVerified, setIsVerified] = useState(false); // สถานะยืนยันสิทธิ์

    const handleStartAction = (lockerId, actionType) => {
        setActiveLocker(lockerId);
        setActiveAction(actionType);
        setCurrentStep('SCANNER');
    };

    const handleActionComplete = (lockerId, success, backToManager = false) => {
        if (backToManager) {
            setActiveLocker(null);
            setActiveAction(null);
            setCurrentStep('MANAGER');
            return;
        }

        setIsVerified(success);
        if (success) {
            setCurrentStep('CONTROL');
        } else {
            // ยืนยันสิทธิ์ไม่สำเร็จ: แจ้งเตือนแล้วกลับไปหน้าหลัก
            setTimeout(() => {
                setActiveLocker(null);
                setActiveAction(null);
                setCurrentStep('MANAGER');
            }, 3000); 
        }
    };

    const renderContent = () => {
        if (currentStep === 'MANAGER') {
            return <LockerManager onStartAction={handleStartAction} />;
        }
        
        if (currentStep === 'SCANNER') {
            return (
                <QrScanner
                    lockerId={activeLocker}
                    actionType={activeAction}
                    onActionComplete={handleActionComplete}
                />
            );
        }

        if (currentStep === 'CONTROL' && isVerified) {
            return (
                <DoorControl
                    lockerId={activeLocker}
                    actionType={activeAction}
                    onFinished={() => handleActionComplete(activeLocker, false, true)} // กลับไปหน้า MANAGER
                />
            );
        }

        return <div style={{padding: '50px'}}>กำลังโหลด...</div>;
    };

    return (
        <div className="App" style={{ fontFamily: 'Arial, sans-serif' }}>
            {renderContent()}
        </div>
    );
}

export default App;