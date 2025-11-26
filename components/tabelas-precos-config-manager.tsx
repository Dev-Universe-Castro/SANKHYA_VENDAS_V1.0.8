
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface TabelaPrecoConfig {
  CODCONFIG?: number
  NUTAB: number
  CODTAB: string
  DESCRICAO?: string
  ATIVO?: string
}

interface TabelaPreco {
  NUTAB: number
  CODTAB: string
  DTVIGOR: string
  PERCENTUAL: number
}

export default function TabelasPrecosConfigManager() {
  const [configs, setConfigs] = useState<TabelaPrecoConfig[]>([])
  const [tabelasDisponiveis, setTabelasDisponiveis] = useState<TabelaPreco[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<TabelaPrecoConfig | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState<TabelaPrecoConfig>({
    NUTAB: 0,
    CODTAB: '',
    DESCRICAO: ''
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      // Carregar configurações do cache primeiro
      const cachedConfigs = sessionStorage.getItem('cached_tabelasPrecosConfig')
      if (cachedConfigs) {
        try {
          const parsedConfigs = JSON.parse(cachedConfigs)
          const configsList = Array.isArray(parsedConfigs) ? parsedConfigs : (parsedConfigs.configs || parsedConfigs.data || [])
          setConfigs(configsList)
          console.log('✅ Configurações de tabelas de preços carregadas do cache:', configsList.length)
        } catch (e) {
          console.warn('⚠️ Erro ao processar cache de configurações de tabelas de preços')
        }
      } else {
        // Se não houver cache, buscar da API
        const resConfigs = await fetch('/api/tabelas-precos-config')
        if (resConfigs.ok) {
          const data = await resConfigs.json()
          setConfigs(data.configs || [])
        }
      }

      // Carregar tabelas de preços disponíveis do cache
      const cachedTabelas = sessionStorage.getItem('cached_tabelasPrecos')
      if (cachedTabelas) {
        try {
          const parsedTabelas = JSON.parse(cachedTabelas)
          const tabelasList = Array.isArray(parsedTabelas) ? parsedTabelas : (parsedTabelas.tabelas || parsedTabelas.data || [])
          setTabelasDisponiveis(tabelasList)
          console.log('✅ Tabelas de preços disponíveis carregadas do cache:', tabelasList.length)
        } catch (e) {
          console.warn('⚠️ Erro ao processar cache de tabelas de preços')
        }
      } else {
        // Se não houver cache, buscar da API
        const resTabelas = await fetch('/api/oracle/tabelas-precos')
        if (resTabelas.ok) {
          const data = await resTabelas.json()
          setTabelasDisponiveis(data.tabelas || [])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const abrirModalNovo = () => {
    setFormData({
      NUTAB: 0,
      CODTAB: '',
      DESCRICAO: ''
    })
    setEditando(null)
    setShowModal(true)
  }

  const abrirModalEditar = (config: TabelaPrecoConfig) => {
    setFormData({ ...config })
    setEditando(config)
    setShowModal(true)
  }

  const handleTabelaChange = (nutab: string) => {
    const tabela = tabelasDisponiveis.find(t => String(t.NUTAB) === nutab)
    if (tabela) {
      setFormData({
        ...formData,
        NUTAB: tabela.NUTAB,
        CODTAB: tabela.CODTAB,
        DESCRICAO: `Tabela ${tabela.CODTAB}`
      })
    }
  }

  const handleSubmit = async () => {
    if (!formData.NUTAB || formData.NUTAB === 0) {
      toast.error('Selecione uma tabela de preços')
      return
    }

    setLoading(true)
    try {
      const url = '/api/tabelas-precos-config'
      const method = editando ? 'PUT' : 'POST'
      
      const payload = editando 
        ? { ...formData, CODCONFIG: editando.CODCONFIG }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success(editando ? 'Configuração atualizada' : 'Configuração criada')
        setShowModal(false)
        // Invalidar cache
        sessionStorage.removeItem('cached_tabelasPrecosConfig')
        carregarDados()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao salvar configuração')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar configuração')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletar = async (codConfig: number) => {
    if (!confirm('Deseja realmente desativar esta configuração?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tabelas-precos-config?codConfig=${codConfig}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Configuração desativada')
        // Invalidar cache
        sessionStorage.removeItem('cached_tabelasPrecosConfig')
        carregarDados()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao desativar')
      }
    } catch (error) {
      console.error('Erro ao deletar:', error)
      toast.error('Erro ao desativar configuração')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar tabelas já configuradas
  const tabelasNaoConfiguradas = tabelasDisponiveis.filter(
    t => !configs.some(c => c.NUTAB === t.NUTAB)
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tabelas de Preços</CardTitle>
          <Button onClick={abrirModalNovo} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nova Tabela
          </Button>
        </CardHeader>
        <CardContent>
          {loading && configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma tabela de preços configurada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>NUTAB</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.CODCONFIG}>
                    <TableCell className="font-medium">
                      {config.CODTAB}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{config.NUTAB}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {config.DESCRICAO || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirModalEditar(config)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletar(config.CODCONFIG!)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar Configuração' : 'Nova Configuração'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tabela de Preços *</Label>
              <Select
                value={String(formData.NUTAB || '')}
                onValueChange={handleTabelaChange}
                disabled={!!editando}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tabela..." />
                </SelectTrigger>
                <SelectContent>
                  {(editando ? tabelasDisponiveis : tabelasNaoConfiguradas).map((tabela) => (
                    <SelectItem key={tabela.NUTAB} value={String(tabela.NUTAB)}>
                      {tabela.CODTAB} (NUTAB: {tabela.NUTAB})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.DESCRICAO}
                onChange={(e) => setFormData({ ...formData, DESCRICAO: e.target.value })}
                placeholder="Ex: Tabela de Preços Padrão"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
