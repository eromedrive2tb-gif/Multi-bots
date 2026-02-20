/** @jsxImportSource react */
import React from 'react'
import { DashboardLayout } from './DashboardLayout'

interface BlueprintsTemplateProps {
    title: string
    currentPath: string
    alertSlot?: React.ReactNode
    listSlot: React.ReactNode
    editorSlot: React.ReactNode
    modalSlot?: React.ReactNode
}

export const BlueprintsTemplate: React.FC<BlueprintsTemplateProps> = ({
    title,
    currentPath,
    alertSlot,
    listSlot,
    editorSlot,
    modalSlot,
}) => {
    return (
        <DashboardLayout title={title} currentPath={currentPath}>
            <div className="blueprints-template-wrapper">
                {/* Status Messages Slot */}
                <div className="alert-container">
                    {alertSlot}
                </div>

                {/* List Section Slot */}
                <section className="blueprints-list-section">
                    {listSlot}
                </section>

                {/* Visual Editor Section Slot */}
                <section className="editor-section">
                    <div className="section-header">
                        <h2>Editor Visual</h2>
                    </div>
                    <div className="editor-canvas-container">
                        {editorSlot}
                    </div>
                </section>
            </div>

            {/* Modal Slot */}
            {modalSlot}

            <style>{`
                .blueprints-template-wrapper { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 24px; 
                }
                .blueprints-list-section, .editor-section { 
                    background: var(--card-bg); 
                    border-radius: 12px; 
                    padding: 20px; 
                    border: 1px solid var(--border-color); 
                }
                .section-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 16px; 
                }
                .section-header h2 { 
                    margin: 0; 
                    font-size: 1.25rem; 
                    color: var(--text-primary); 
                }
                .editor-canvas-container { 
                    min-height: 700px; 
                    border-radius: 8px; 
                    overflow: hidden; 
                }
                .alert-container { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 8px; 
                }
            `}</style>
        </DashboardLayout>
    )
}
