// src/components/DoorControl.js

import React, { useEffect } from 'react';

function DoorControl({ lockerId, actionType, onFinished }) {
    
    // ใช้ useEffect เพื่อจำลองการสั่งเปิดประตู
    useEffect(() => {
        console.log(`[ACTION] กำลังสั่งเปิดประตู Locker ${lockerId} สำหรับการ ${actionType}`);

        // จำลองการเปิดประตู 3 วินาที
        const timer = setTimeout(() => {
            alert(`ประตู Locker ${lockerId} ถูกเปิดเรียบร้อย!`);
            onFinished(); // กลับไปหน้าหลักเมื่อเสร็จสิ้น
        }, 3000); 

        return () => clearTimeout(timer);
    }, [lockerId, actionType, onFinished]);
    
    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>3. ควบคุมประตู (สำเร็จ!)</h2>
            <p>กรุณาเปิดประตูล็อกเกอร์: <strong>{lockerId}</strong> เพื่อ **{actionType === 'DEPOSIT' ? 'ใส่รองเท้า' : 'นำรองเท้าออก'}**</p>
            <p>สถานะ: <strong>ประตูถูกสั่งเปิดแล้ว</strong></p>
            <p style={{marginTop: '20px', color: 'orange'}}>ระบบจะกลับสู่หน้าหลักอัตโนมัติเมื่อครบ 3 วินาที</p>
        </div>
    );
}

export default DoorControl;