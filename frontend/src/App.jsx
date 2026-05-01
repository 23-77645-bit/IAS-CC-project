import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import TeacherDashboard from './pages/TeacherDashboard'
import './styles/TeacherDashboard.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Status styles configuration
const statusStyles = {
  idle: { bg: 'bg-gray-100', text: 'text-gray-600', icon: '📷' },
  scanning: { bg: 'bg-blue-100', text: 'text-blue-600', icon: '🔍' },
  success: { bg: 'bg-green-100', text: 'text-green-600', icon: '✅' },
  duplicate: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: '⚠️' },
  invalid: { bg: 'bg-red-100', text: 'text-red-600', icon: '❌' },
  error: { bg: 'bg-orange-100', text: 'text-orange-600', icon: '🔄' },
}

function ScannerApp() {
  const [scannerStatus, setScannerStatus] = useState('idle')
  const [lastScan, setLastScan] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const scanTimeoutRef = useRef(null)

  // Generate device ID on mount
  useEffect(() => {
    const storedId = localStorage.getItem('scanner_device_id')
    if (storedId) {
      setDeviceId(storedId)
    } else {
      const newId = `scanner-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('scanner_device_id', newId)
      setDeviceId(newId)
    }
  }, [])

  // Initialize QR reader
  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader()
    
    return () => {
      stopScanning()
      if (readerRef.current) {
        readerRef.current.reset()
      }
    }
  }, [])

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset()
    }
    setIsCameraOn(false)
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
    }
  }, [])

  const handleScanResult = useCallback(async (result) => {
    const qrText = result.getText()
    
    // Prevent duplicate rapid scans
    if (lastScan && lastScan.qr_payload === qrText && scannerStatus === 'scanning') {
      return
    }

    setScannerStatus('scanning')
    stopScanning()

    try {
      const response = await fetch(`${API_BASE_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_payload: qrText,
          device_id: deviceId,
          request_id: `${deviceId}-${Date.now()}`,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setScannerStatus('success')
        setLastScan({
          student: data.student,
          status: data.status,
          timestamp: new Date(data.timestamp),
          qr_payload: qrText,
        })
        setScanHistory(prev => [{
          student: data.student,
          status: data.status,
          timestamp: new Date(),
          reason: data.reason_code,
        }, ...prev].slice(0, 10))
      } else {
        setScannerStatus(data.status === 'duplicate' ? 'duplicate' : 'invalid')
        setLastScan({
          student: data.student,
          status: data.status,
          timestamp: new Date(data.timestamp),
          qr_payload: qrText,
          reason: data.reason_code,
        })
      }
    } catch (error) {
      console.error('Scan error:', error)
      setScannerStatus('error')
      setErrorMessage('Network error. Tap to retry.')
    }

    // Auto-reset scanner after delay
    scanTimeoutRef.current = setTimeout(() => {
      setScannerStatus('idle')
      setErrorMessage('')
      startScanning()
    }, 3000)
  }, [deviceId, lastScan, scannerStatus, stopScanning])

  const startScanning = useCallback(async () => {
    if (!videoRef.current || !readerRef.current) return

    try {
      await readerRef.current.decodeFromVideoDevice(
        null, // Use default camera
        videoRef.current,
        (result, error) => {
          if (result) {
            handleScanResult(result)
          }
          if (error) {
            console.log('Scan error (continuing):', error)
          }
        }
      )
      setIsCameraOn(true)
      setScannerStatus('idle')
    } catch (error) {
      console.error('Camera error:', error)
      setScannerStatus('error')
      setErrorMessage('Camera access denied. Please enable camera permissions.')
    }
  }, [handleScanResult])

  const handleManualRetry = () => {
    setErrorMessage('')
    setScannerStatus('idle')
    startScanning()
  }

  const getStatusMessage = () => {
    switch (scannerStatus) {
      case 'idle':
        return 'Ready to scan'
      case 'scanning':
        return 'Processing...'
      case 'success':
        return `✓ ${lastScan?.student?.name || 'Student'} marked present`
      case 'duplicate':
        return `⚠ Already scanned (${lastScan?.reason || 'DUPLICATE'})`
      case 'invalid':
        return `✗ ${lastScan?.reason || 'Invalid QR code'}`
      case 'error':
        return errorMessage || 'Error occurred'
      default:
        return ''
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>📚 Attendance Scanner</h1>
        {deviceId && <span className="device-id">Device: {deviceId}</span>}
      </header>

      <main className="main">
        <div className={`status-card ${statusStyles[scannerStatus]?.bg || ''}`}>
          <div className="status-icon">
            {statusStyles[scannerStatus]?.icon || '❓'}
          </div>
          <div className={`status-text ${statusStyles[scannerStatus]?.text || ''}`}>
            {getStatusMessage()}
          </div>
          
          {lastScan && lastScan.student && (
            <div className="student-info">
              <strong>{lastScan.student.name}</strong>
              <span>{lastScan.student.program || ''}</span>
            </div>
          )}
        </div>

        <div className="camera-container">
          <video 
            ref={videoRef} 
            className="camera-feed"
            playsInline
            muted
          />
          
          {!isCameraOn && scannerStatus !== 'error' && (
            <button 
              className="start-camera-btn"
              onClick={startScanning}
            >
              📷 Start Camera
            </button>
          )}
          
          {scannerStatus === 'error' && (
            <button 
              className="retry-btn"
              onClick={handleManualRetry}
            >
              🔄 Retry
            </button>
          )}
        </div>

        {scanHistory.length > 0 && (
          <div className="history-section">
            <h2>Recent Scans</h2>
            <div className="scan-history">
              {scanHistory.map((scan, index) => (
                <div key={index} className={`history-item status-${scan.status}`}>
                  <div className="history-icon">
                    {scan.status === 'present' ? '✅' : 
                     scan.status === 'duplicate' ? '⚠️' : '❌'}
                  </div>
                  <div className="history-info">
                    <span className="history-name">{scan.student?.name || 'Unknown'}</span>
                    <span className="history-time">
                      {scan.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="history-status">{scan.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Attendance Management System v1.0</p>
      </footer>

      <style jsx>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          background: rgba(255, 255, 255, 0.95);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
          font-size: 1.5rem;
          color: #333;
        }
        
        .device-id {
          font-size: 0.875rem;
          color: #666;
          background: #f0f0f0;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
        }
        
        .main {
          flex: 1;
          padding: 2rem;
          max-width: 600px;
          margin: 0 auto;
          width: 100%;
        }
        
        .status-card {
          border-radius: 1rem;
          padding: 2rem;
          text-align: center;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }
        
        .status-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        
        .status-text {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .student-info {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0,0,0,0.1);
        }
        
        .student-info strong {
          display: block;
          font-size: 1.125rem;
          margin-bottom: 0.25rem;
        }
        
        .student-info span {
          font-size: 0.875rem;
          opacity: 0.8;
        }
        
        .camera-container {
          position: relative;
          background: #000;
          border-radius: 1rem;
          overflow: hidden;
          margin-bottom: 2rem;
          aspect-ratio: 4/3;
        }
        
        .camera-feed {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .start-camera-btn,
        .retry-btn {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          color: #333;
          border: none;
          padding: 1rem 2rem;
          font-size: 1.125rem;
          font-weight: 600;
          border-radius: 0.5rem;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          transition: transform 0.2s;
        }
        
        .start-camera-btn:hover,
        .retry-btn:hover {
          transform: translate(-50%, -50%) scale(1.05);
        }
        
        .history-section {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .history-section h2 {
          font-size: 1.125rem;
          margin-bottom: 1rem;
          color: #333;
        }
        
        .scan-history {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .history-item {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 0.5rem;
          gap: 1rem;
        }
        
        .history-icon {
          font-size: 1.5rem;
        }
        
        .history-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .history-name {
          font-weight: 600;
          color: #333;
        }
        
        .history-time {
          font-size: 0.75rem;
          color: #666;
        }
        
        .history-status {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          text-transform: uppercase;
          font-weight: 600;
        }
        
        .status-present .history-status {
          background: #d4edda;
          color: #155724;
        }
        
        .status-duplicate .history-status {
          background: #fff3cd;
          color: #856404;
        }
        
        .status-invalid .history-status {
          background: #f8d7da;
          color: #721c24;
        }
        
        .footer {
          background: rgba(255, 255, 255, 0.9);
          padding: 1rem;
          text-align: center;
          color: #666;
          font-size: 0.875rem;
        }
        
        @media (max-width: 640px) {
          .header {
            padding: 1rem;
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .main {
            padding: 1rem;
          }
          
          .status-card {
            padding: 1.5rem;
          }
          
          .status-icon {
            font-size: 3rem;
          }
        }
      `}</style>
    </div>
  )
}

// Main App with routing
function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="main-nav">
          <Link to="/" className="nav-link">📷 Scanner</Link>
          <Link to="/teacher" className="nav-link">✨ Teacher Dashboard</Link>
        </nav>
        <Routes>
          <Route path="/" element={<ScannerApp />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
        </Routes>
      </div>
      <style jsx global>{`
        .app-container {
          min-height: 100vh;
        }
        .main-nav {
          background: #2563eb;
          padding: 1rem 2rem;
          display: flex;
          gap: 2rem;
        }
        .nav-link {
          color: white;
          text-decoration: none;
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          transition: background 0.2s;
        }
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </Router>
  )
}

export default App
