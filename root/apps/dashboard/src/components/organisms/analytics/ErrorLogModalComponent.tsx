/** @jsxImportSource react */

import React, { useState, useEffect } from 'react'

interface ErrorLogItem {
    id: string
    timestamp: string
    severity: number
    error_message: string
    blueprint_name?: string
    step_id: string
    bot_name?: string
}

interface ErrorLogModalProps {
    isOpen: boolean
    onClose: () => void
    token?: string
}

interface ErrorLogResponse {
    success: boolean
    data?: {
        errors: ErrorLogItem[]
        total: number
    }
    error?: string
}

const SeverityBadge = ({ severity }: { severity: number }) => {
    switch (severity) {
        case 1: // LOW
            return <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded border border-yellow-200">Alert (L1)</span>
        case 2: // MEDIUM
            return <span className="bg-orange-100 text-orange-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded border border-orange-200">Warning (L2)</span>
        case 3: // HIGH
            return <span className="bg-red-100 text-red-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded border border-red-200">Error (L3)</span>
        case 4: // CRITICAL
            return <span className="bg-red-200 text-red-900 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded border border-red-400">Critical (L4)</span>
        default:
            return <span className="bg-gray-100 text-gray-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded border border-gray-500">Info</span>
    }
}

export const ErrorLogModal = ({ isOpen, onClose }: ErrorLogModalProps) => {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-8 rounded">
                Hello World - Debugging
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    )
}
