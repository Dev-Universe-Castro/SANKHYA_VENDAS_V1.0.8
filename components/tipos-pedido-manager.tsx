
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Check, X } from "lucide-react"
import { toast } from "sonner"

interface TipoPedido {
  CODTIPOPEDIDO?: number
  NOME: string
  DESCRICAO?: string
  CODTIPOPER: number
  MODELO_NOTA: number
  TIPMOV: string
  CODTIPVENDA: number
  COR?: string
  ATIVO?: string
}

export default function TiposPedidoManager() {
  const [tiposPedido, setTiposPedido] = useState<TipoPedido[]>([])
  const [tiposOperacao, setTiposOperacao] = useState<any[]>([])
  const [tiposNegociacao, setTiposNegociacao] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<TipoPedido | null>(null)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState<TipoPedido>({
    NOME: '',
    DESCRICAO: '',
    CODTIPOPER: 0,
    MODELO_NOTA: 0,
    TIPMOV: 'P',
    CODTIPVENDA: 0,
    COR: '#3b82f6'
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      // Tentar carregar do cache primeiro
      const tiposPedidoCache = sessionStorage.getItem('cached_tiposPedido')
      
      if (tiposPedidoCache) {
        try {
          let tiposData = JSON.parse(tiposPedidoCache)
          
          // Verificar se é array direto ou objeto com propriedade data
          if (!Array.isArray(tiposData)) {
            tiposData = tiposData.data || tiposData.tiposPedido || []
          }
          
          if (tiposData.length > 0) {
            setTiposPedido(tiposData)
            console.log('✅ Tipos de pedido carregados do cache:', tiposData.length)
            
            // Tentar atualizar em background, mas não bloquear a UI
            fetch('/api/tipos-pedido')
              .then(res => res.ok ? res.json() : null)
              .then(data => {
                if (data?.tiposPedido && data.tiposPedido.length > 0) {
                  setTiposPedido(data.tiposPedido)
                  sessionStorage.setItem('cached_tiposPedido', JSON.stringify(data.tiposPedido))
                  console.log('🔄 Cache atualizado em background')
                }
              })
              .catch(() => console.log('⚠️ Mantendo dados do cache - sem conexão'))
            
            setLoading(false)
            return
          }
        } catch (e) {
          console.error('❌ Erro ao parsear cache de tipos de pedido:', e)
          sessionStorage.removeItem('cached_tiposPedido')
        }
      }
      
      // Se não houver cache válido, buscar da API
      console.log('🔄 Cache vazio, buscando tipos de pedido da API...')
      try {
        const response = await fetch('/api/tipos-pedido')
        if (response.ok) {
          const data = await response.json()
          const tiposData = data.tiposPedido || []
          
          setTiposPedido(tiposData)
          console.log('✅ Tipos de pedido carregados da API:', tiposData.length)
          
          // Salvar no cache
          if (tiposData.length > 0) {
            sessionStorage.setItem('cached_tiposPedido', JSON.stringify(tiposData))
            console.log('💾 Tipos de pedido salvos no cache')
          }
        } else {
          console.error('❌ Erro na resposta da API:', response.status)
          const errorData = await response.json()
          
          // Se a API retornou dados em cache mesmo com erro
          if (errorData.tiposPedido && errorData.tiposPedido.length > 0) {
            setTiposPedido(errorData.tiposPedido)
            sessionStorage.setItem('cached_tiposPedido', JSON.stringify(errorData.tiposPedido))
            toast.warning('Exibindo dados em cache (modo offline)')
          } else {
            toast.error('Erro ao carregar tipos de pedido')
          }
        }
      } catch (error) {
        console.error('❌ Erro ao buscar tipos de pedido da API:', error)
        toast.error('Não foi possível carregar os tipos de pedido. Verifique sua conexão.')
      }

      // Carregar tipos de operação do cache
      let tiposOp = []
      const tiposOperacaoCache = sessionStorage.getItem('cached_tiposOperacao')
      if (tiposOperacaoCache) {
        try {
          tiposOp = JSON.parse(tiposOperacaoCache)
          setTiposOperacao(tiposOp || [])
          console.log('✅ Tipos de operação carregados do cache:', tiposOp.length)
        } catch (e) {
          console.error('Erro ao parsear cache de tipos de operação:', e)
        }
      }
      
      // Se cache estiver vazio, buscar da API
      if (!tiposOp || tiposOp.length === 0) {
        console.log('🔄 Cache vazio, buscando tipos de operação da API...')
        try {
          const response = await fetch('/api/sankhya/tipos-negociacao?tipo=operacao')
          if (response.ok) {
            const data = await response.json()
            tiposOp = data.tiposOperacao || []
            setTiposOperacao(tiposOp)
            console.log('✅ Tipos de operação carregados da API:', tiposOp.length)
          }
        } catch (error) {
          console.error('Erro ao buscar tipos de operação da API:', error)
        }
      }

      // Carregar condições comerciais do cache
      let tiposNeg = []
      const tiposNegociacaoCache = sessionStorage.getItem('cached_tiposNegociacao')
      if (tiposNegociacaoCache) {
        try {
          tiposNeg = JSON.parse(tiposNegociacaoCache)
          setTiposNegociacao(tiposNeg || [])
          console.log('✅ Tipos de negociação carregados do cache:', tiposNeg.length)
        } catch (e) {
          console.error('Erro ao parsear cache de tipos de negociação:', e)
        }
      }
      
      // Se cache estiver vazio, buscar da API
      if (!tiposNeg || tiposNeg.length === 0) {
        console.log('🔄 Cache vazio, buscando tipos de negociação da API...')
        try {
          const response = await fetch('/api/sankhya/tipos-negociacao')
          if (response.ok) {
            const data = await response.json()
            tiposNeg = data.tiposNegociacao || []
            setTiposNegociacao(tiposNeg)
            console.log('✅ Tipos de negociação carregados da API:', tiposNeg.length)
          }
        } catch (error) {
          console.error('Erro ao buscar tipos de negociação da API:', error)
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
      NOME: '',
      DESCRICAO: '',
      CODTIPOPER: 0,
      MODELO_NOTA: 0,
      TIPMOV: 'P',
      CODTIPVENDA: 0,
      COR: '#3b82f6'
    })
    setEditando(null)
    setShowModal(true)
  }

  const abrirModalEditar = (tipo: TipoPedido) => {
    setFormData({ ...tipo })
    setEditando(tipo)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formData.NOME || formData.NOME.trim() === '') {
      toast.error('Nome é obrigatório')
      return
    }

    if (!formData.CODTIPOPER || formData.CODTIPOPER === 0) {
      toast.error('Tipo de Operação é obrigatório')
      return
    }

    if (!formData.MODELO_NOTA || formData.MODELO_NOTA === 0) {
      toast.error('Modelo da Nota é obrigatório')
      return
    }

    if (!formData.CODTIPVENDA || formData.CODTIPVENDA === 0) {
      toast.error('Condição Comercial é obrigatória')
      return
    }

    setLoading(true)
    try {
      const url = '/api/tipos-pedido'
      const method = editando ? 'PUT' : 'POST'
      
      const payload = editando 
        ? { ...formData, CODTIPOPEDIDO: editando.CODTIPOPEDIDO }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success(editando ? 'Tipo atualizado com sucesso' : 'Tipo criado com sucesso')
        setShowModal(false)
        
        // Recarregar prefetch para atualizar cache
        console.log('🔄 Recarregando prefetch após salvar tipo de pedido...')
        const prefetchRes = await fetch('/api/prefetch', { method: 'POST' })
        if (prefetchRes.ok) {
          const prefetchData = await prefetchRes.json()
          if (prefetchData.tiposPedido?.data) {
            sessionStorage.setItem('cached_tiposPedido', JSON.stringify(prefetchData.tiposPedido.data))
          }
        }
        
        carregarDados()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao salvar tipo')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar tipo de pedido')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletar = async (codTipoPedido: number) => {
    if (!confirm('Deseja realmente desativar este tipo de pedido?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/tipos-pedido?codTipoPedido=${codTipoPedido}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Tipo desativado com sucesso')
        
        // Recarregar prefetch para atualizar cache
        console.log('🔄 Recarregando prefetch após desativar tipo de pedido...')
        const prefetchRes = await fetch('/api/prefetch', { method: 'POST' })
        if (prefetchRes.ok) {
          const prefetchData = await prefetchRes.json()
          if (prefetchData.tiposPedido?.data) {
            sessionStorage.setItem('cached_tiposPedido', JSON.stringify(prefetchData.tiposPedido.data))
          }
        }
        
        carregarDados()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao desativar tipo')
      }
    } catch (error) {
      console.error('Erro ao deletar:', error)
      toast.error('Erro ao desativar tipo de pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tipos de Pedido</CardTitle>
          <Button onClick={abrirModalNovo} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Novo Tipo
          </Button>
        </CardHeader>
        <CardContent>
          {loading && tiposPedido.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : tiposPedido.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum tipo de pedido cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo Mov.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposPedido.map((tipo) => (
                  <TableRow key={tipo.CODTIPOPEDIDO}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tipo.COR }}
                        />
                        {tipo.NOME}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tipo.DESCRICAO || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tipo.TIPMOV === 'P' ? 'default' : 'secondary'}>
                        {tipo.TIPMOV === 'P' ? 'Pedido' : 'Venda'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirModalEditar(tipo)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletar(tipo.CODTIPOPEDIDO!)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar Tipo de Pedido' : 'Novo Tipo de Pedido'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.NOME}
                  onChange={(e) => setFormData({ ...formData, NOME: e.target.value })}
                  placeholder="Ex: Venda Padrão"
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={formData.COR}
                  onChange={(e) => setFormData({ ...formData, COR: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.DESCRICAO}
                onChange={(e) => setFormData({ ...formData, DESCRICAO: e.target.value })}
                placeholder="Descrição do tipo de pedido..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Operação *</Label>
                <Select
                  value={String(formData.CODTIPOPER)}
                  onValueChange={(value) => setFormData({ ...formData, CODTIPOPER: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposOperacao.map((tipo) => (
                      <SelectItem key={tipo.CODTIPOPER} value={String(tipo.CODTIPOPER)}>
                        {tipo.CODTIPOPER} - {tipo.DESCROPER}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modelo da Nota *</Label>
                <Input
                  type="number"
                  value={formData.MODELO_NOTA || ''}
                  onChange={(e) => setFormData({ ...formData, MODELO_NOTA: Number(e.target.value) })}
                  placeholder="Ex: 55"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Movimento *</Label>
                <Select
                  value={formData.TIPMOV}
                  onValueChange={(value) => setFormData({ ...formData, TIPMOV: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P">Pedido</SelectItem>
                    <SelectItem value="V">Venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condição Comercial *</Label>
                <Select
                  value={String(formData.CODTIPVENDA)}
                  onValueChange={(value) => setFormData({ ...formData, CODTIPVENDA: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposNegociacao.map((tipo) => (
                      <SelectItem key={tipo.CODTIPVENDA} value={String(tipo.CODTIPVENDA)}>
                        {tipo.DESCRTIPVENDA}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
