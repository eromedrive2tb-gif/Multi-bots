/** @jsxImportSource react */
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    size = 'md',
    children
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    const maxWidths = {
        sm: '400px',
        md: '600px',
        lg: '800px',
        xl: '1000px'
    }

    const content = (
        <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: maxWidths[size] }}
            >
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {children}
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.2s ease-in-out;
                    backdrop-filter: blur(4px);
                }

                .modal-overlay.open {
                    opacity: 1;
                    visibility: visible;
                }

                .modal-content {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    width: 100%;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    transform: scale(0.95);
                    transition: transform 0.2s ease;
                }

                .modal-overlay.open .modal-content {
                    transform: scale(1);
                }

                .modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .modal-title {
                    margin: 0;
                    font-size: 1.25rem;
                    color: var(--text-primary);
                }

                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: var(--text-secondary);
                    cursor: pointer;
                    line-height: 1;
                    padding: 4px;
                    border-radius: 4px;
                    transition: color 0.15s;
                }

                .modal-close:hover {
                    color: var(--text-primary);
                    background: rgba(255, 255, 255, 0.1);
                }

                .modal-body {
                    padding: 24px;
                    overflow-y: auto;
                }
            `}</style>
        </div>
    )

    return createPortal(content, document.body)
}
