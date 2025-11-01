// src/components/QrScanner.js

// ⭐️ 1. IMPORT: ครบถ้วน
import React, { useState, useEffect, useRef } from 'react';

// ⭐️ 2. IMPORT (แก้ไข): ใช้ @yudiel/react-qr-scanner แทน
import { Scanner } from '@yudiel/react-qr-scanner'; 
import { db, ref, update, serverTimestamp, onValue } from '../Firebase/Firebase'; 

// ⭐️ 3. IMPORT: 'jsQR' (สำหรับอัปโหลดไฟล์)
import jsQR from 'jsqr';

function QrScanner({ lockerId, actionType, onActionComplete }) {
  // --- State ทั้งหมด ---
  const [isScanning, setIsScanning] = useState(false); 
  const [scanResult, setScanResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lockerData, setLockerData] = useState({});
  const [stopScanner, setStopScanner] = useState(false); 
  
  // --- State และ Ref สำหรับการอัปโหลดไฟล์ ---
  const fileInputRef = useRef(null);
  const [fileScanError, setFileScanError] = useState(null); 

  // --- Listener (เหมือนเดิม) ---
  useEffect(() => {
    if (!lockerId) return;
    const dbRef = ref(db, `lockers/${lockerId}`);
    const unsubscribe = onValue(dbRef, (snapshot) => {
        setLockerData(snapshot.val() || {});
    });
    return () => unsubscribe();
  }, [lockerId]);

  // --- Effect รีเซ็ต (เหมือนเดิม) ---
  useEffect(() => {
    if (stopScanner) {
        const timer = setTimeout(() => {
            setStopScanner(false);
        }, 500); 
        return () => clearTimeout(timer);
    }
  }, [stopScanner]);

  // --- ฟังก์ชัน handleValidationAndSave (ใช้ร่วมกันทั้งกล้องและอัปโหลด) ---
  const handleValidationAndSave = async (ownerId) => {
    setIsSaving(true);
    try {
      const currentStatus = lockerData.status || 'AVAILABLE';
      if (actionType === 'DEPOSIT') {
        if (currentStatus === 'AVAILABLE') {
            const updates = { status: 'OCCUPIED', ownerId: ownerId, deposit_time: serverTimestamp(), relay_command: 1 };
            await update(ref(db, `lockers/${lockerId}`), updates);
            alert(`✅ เก็บสำเร็จ! สั่งเปิด Locker ${lockerId} เพื่อฝากรองเท้า`);
            onActionComplete(lockerId, true); 
        } else {
            alert(`❌ ล็อกเกอร์ ${lockerId} ไม่ว่าง! (ถูกจองแล้ว)`);
            onActionComplete(lockerId, false, true); 
        }
      } else if (actionType === 'WITHDRAW') {
        if (currentStatus === 'OCCUPIED' && lockerData.ownerId === ownerId) {
            const updates = { status: 'AVAILABLE', ownerId: null, deposit_time: null, withdrawal_time: serverTimestamp(), relay_command: 1 };
            await update(ref(db, `lockers/${lockerId}`), updates);
            alert(`✅ ยืนยันสำเร็จ! สั่งเปิด Locker ${lockerId} เพื่อนำรองเท้าออก`);
            onActionComplete(lockerId, true); 
        } else {
            alert('❌ ยืนยันไม่สำเร็จ! รหัสไม่ตรงกับเจ้าของล็อกเกอร์');
            onActionComplete(lockerId, false); 
        }
      }
    } catch (error) {
      console.error("Firebase Update Error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      onActionComplete(lockerId, false);
    } finally {
      setIsSaving(false);
    }
  };

  // --- 1. ฟังก์ชันสำหรับ "กล้องเว็บแคม" ---
  const handleWebcamResult = (detectedCodes) => {
    const data = detectedCodes[0]?.rawValue; // ดึงข้อมูลตัวอักษร
    if (data) {
      setScanResult(data);
      handleValidationAndSave(data); // <-- เรียกใช้ฟังก์ชันเดิม
      setStopScanner(true); 
      setIsScanning(false); 
    }
  };

  // --- 1. ฟังก์ชัน Error สำหรับ "กล้องเว็บแคม" ---
  const handleWebcamError = (error) => {
    console.error(error?.message);
    if (error?.name === 'NotAllowedError') {
        alert('คุณต้องอนุญาตให้เข้าถึงกล้องเพื่อสแกน');
        setIsScanning(false);
    }
  };

  // --- ฟังก์ชันเริ่มสแกน (กล้อง) ---
  const startScanning = () => {
    setScanResult(null); 
    setFileScanError(null);
    setTimeout(() => {
        setIsScanning(true);
    }, 1); 
  };

  // --- 2. ฟังก์ชันสำหรับ "อัปโหลดไฟล์" (ใช้ jsQR) ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsSaving(true); 
    setFileScanError(null);
    setScanResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code) {
          setFileScanError(null);
          setScanResult(code.data);
          handleValidationAndSave(code.data); // <--- เรียกใช้ฟังก์ชันเดิม
          setIsSaving(false);
        } else {
          setFileScanError('ไม่พบ QR Code ในรูปภาพนี้');
          alert('❌ ไม่พบ QR Code ในรูปภาพนี้');
          setIsSaving(false);
        }
      };
      img.onerror = () => {
        setFileScanError('ไม่สามารถโหลดไฟล์รูปภาพได้');
        alert('❌ ไม่สามารถโหลดไฟล์รูปภาพได้');
        setIsSaving(false);
      };
      img.src = event.target.result; 
    };
    reader.onerror = () => {
        setFileScanError('ไม่สามารถอ่านไฟล์ได้');
        alert('❌ ไม่สามารถอ่านไฟล์ได้');
        setIsSaving(false);
    };
    reader.readAsDataURL(file); 
    e.target.value = null; // รีเซ็ต input เผื่อเลือกไฟล์เดิมซ้ำ
  };

  // --- ⭐️ RENDER (มีทั้ง 2 ตัวเลือก) ---
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>2. สแกน QR Code (LINE ID)</h2>
      <h3>กำลังดำเนินการ: **{actionType}** สำหรับ Locker **{lockerId}**</h3>

      {/* --- 1. ปุ่มสแกนด้วยกล้อง --- */}
      <button 
        onClick={startScanning} 
        disabled={isScanning || isSaving || stopScanner}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', margin: '10px 0' }}
      >
        {isScanning ? 'กำลังรอการสแกน...' : isSaving ? 'กำลังตรวจสอบ...' : '1. เริ่มสแกน (ใช้กล้อง)'}
      </button>

      {/* --- ส่วนแสดงกล้อง (ใช้ <Scanner />) --- */}
      {isScanning && !stopScanner && (
        <div style={{ width: '300px', margin: '20px auto', border: '2px solid #61dafb' }}>
          <Scanner 
            key="scanner-active" 
            onScan={handleWebcamResult}   
            onError={handleWebcamError} 
            styles={{ container: { width: '100%' } }} 
            constraints={{ facingMode: 'environment' }} 
          />
        </div>
      )}

      <hr style={{ margin: '30px auto', width: '80%' }} />

      {/* --- 2. ปุ่มอัปโหลดไฟล์ --- */}
      <p>หรือ... หากไม่มีกล้อง:</p>
      <button
        onClick={() => fileInputRef.current.click()} 
        disabled={isSaving} 
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', margin: '10px 0', background: '#f0f0f0', color: '#333' }}
      >
        {isSaving ? 'กำลังตรวจสอบ...' : '2. อัปโหลดรูป QR Code'}
      </button>
      
      {/* --- Input (ซ่อนไว้) สำหรับรับไฟล์ --- */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange} 
        accept="image/*"
        style={{ display: 'none' }} 
      />
      {fileScanError && <p style={{ color: 'red' }}>{fileScanError}</p>}
      
      {/* --- ส่วนแสดงสถานะ (เหมือนเดิม) --- */}
      <p style={{ marginTop: '30px' }}>สถานะ: **{isSaving ? 'กำลังตรวจสอบ...' : scanResult ? 'สแกนสำเร็จ' : 'รอการสแกน'}**</p>
      
      {scanResult && <p>ค่าที่สแกนได้: {scanResult}</p>}
      
      {/* --- ปุ่มกลับ (เหมือนเดิม) --- */}
      <button onClick={() => onActionComplete(lockerId, false, true)} style={{ marginTop: '20px' }}>
        กลับไปหน้าเลือกล็อกเกอร์
      </button>
    </div>
  );
}

export default QrScanner;