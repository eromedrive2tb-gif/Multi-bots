/** @jsxImportSource react */
import React, { useState } from 'react'
import { Input } from '../../atoms/ui/Input'
import { Button } from '../../atoms/ui/Button'

export const DomainSetup: React.FC = () => {
    return (
        <div className="domain-setup">
            <h3 style={{ margin: 0 }}>🌐 Domínio Próprio</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Configure seu domínio personalizado para links de redirecionamento</p>
            <div className="domain-steps">
                <div className="domain-step">
                    <div className="domain-step-num">1</div>
                    <div className="domain-step-content">
                        <h4>Registre seu domínio</h4>
                        <p>Adquira um domínio em um registrador como Hostgator, GoDaddy, ou Namecheap.</p>
                    </div>
                </div>
                <div className="domain-step">
                    <div className="domain-step-num">2</div>
                    <div className="domain-step-content">
                        <h4>Configure o CNAME</h4>
                        <p>No painel DNS do seu domínio, adicione o seguinte registro CNAME:</p>
                        <div className="domain-cname">
                            <strong>Tipo:</strong> CNAME &nbsp; <strong>Nome:</strong> @ &nbsp; <strong>Valor:</strong> proxy.multibots.app
                        </div>
                    </div>
                </div>
                <div className="domain-step">
                    <div className="domain-step-num">3</div>
                    <div className="domain-step-content">
                        <h4>Adicione seu domínio</h4>
                        <p>Insira seu domínio abaixo para vinculá-lo à plataforma.</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <Input name="domain" placeholder="meudominio.com" />
                            <Button>Adicionar</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
