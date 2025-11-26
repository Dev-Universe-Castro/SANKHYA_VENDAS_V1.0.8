"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import PedidoVendaFromLead from "@/components/pedido-venda-from-lead"
import { toast } from "sonner"
import { useState, useEffect, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface PedidoVendaRapidoProps {
  isOpen: boolean
  onClose: () => void
}

interface TipoPedido {
  CODTIPOPEDIDO: number
  NOME: string
  DESCRICAO?: string
  CODTIPOPER: number
  MODELO_NOTA: number
  TIPMOV: string
  CODTIPVENDA: number
  COR?: string
}

export default function PedidoVendaRapido({ isOpen, onClose }: PedidoVendaRapidoProps) {
  const [codVendUsuario, setCodVendUsuario] = useState("0")
  const [pedido, setPedido] = useState<any>(null)
  const [tiposPedido, setTiposPedido] = useState<TipoPedido[]>([])
  const [tipoPedidoSelecionado, setTipoPedidoSelecionado] = useState<string>("")
  const [vendedores, setVendedores] = useState<any[]>([])
  const [tabelasPrecos, setTabelasPrecos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTipos, setLoadingTipos] = useState(false)
  const salvarPedidoRef = useRef<(() => Promise<boolean>) | null>(null)

  useEffect(() => {
    if (isOpen) {
      carregarVendedorUsuario()
      carregarVendedores()
      carregarTabelasPrecos()
      carregarTiposPedido()
    }
  }, [isOpen])

  const carregarTiposPedido = async () => {
    try {
      setLoadingTipos(true)

      // Tentar buscar do cache primeiro
      const cachedTiposPedido = sessionStorage.getItem('cached_tiposPedido')
      if (cachedTiposPedido) {
        try {
          const data = JSON.parse(cachedTiposPedido)
          const tipos = Array.isArray(data) ? data : (data.data || [])
          setTiposPedido(tipos)
          console.log('✅ Tipos de pedido carregados do cache:', tipos.length)

          // Selecionar o primeiro tipo por padrão
          if (tipos.length > 0) {
            setTipoPedidoSelecionado(String(tipos[0].CODTIPOPEDIDO))
          }
          return
        } catch (e) {
          console.error('Erro ao parsear cache de tipos de pedido:', e)
          sessionStorage.removeItem('cached_tiposPedido')
        }
      }

      // Se não houver cache, buscar da API
      const response = await fetch('/api/tipos-pedido')
      if (!response.ok) throw new Error('Erro ao carregar tipos de pedido')

      const data = await response.json()
      const tipos = data.tiposPedido || []
      setTiposPedido(tipos)
      console.log('✅ Tipos de pedido carregados da API:', tipos.length)

      // Salvar no cache
      if (tipos.length > 0) {
        sessionStorage.setItem('cached_tiposPedido', JSON.stringify(tipos))
      }

      // Selecionar o primeiro tipo por padrão
      if (tipos.length > 0) {
        setTipoPedidoSelecionado(String(tipos[0].CODTIPOPEDIDO))
      }
    } catch (error) {
      console.error('Erro ao carregar tipos de pedido:', error)
      toast.error('Erro ao carregar tipos de pedido. Configure-os em Configurações.')
    } finally {
      setLoadingTipos(false)
    }
  }

  const carregarVendedores = async () => {
    try {
      const response = await fetch('/api/vendedores?tipo=vendedores')
      if (response.ok) {
        const data = await response.json()
        setVendedores(data)
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error)
    }
  }

  const carregarVendedorUsuario = () => {
    try {
      const userStr = document.cookie
        .split('; ')
        .find(row => row.startsWith('user='))
        ?.split('=')[1]

      if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr))

        if (user.codVendedor) {
          setCodVendUsuario(String(user.codVendedor))
          console.log('✅ Vendedor do usuário carregado:', user.codVendedor)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar vendedor do usuário:', error)
    }
  }

  const carregarTabelasPrecos = async () => {
    try {
      // Buscar do cache de configurações primeiro
      const cachedConfig = sessionStorage.getItem('cached_tabelasPrecosConfig')
      if (cachedConfig) {
        try {
          const parsedCache = JSON.parse(cachedConfig)
          const configs = Array.isArray(parsedCache) ? parsedCache : (parsedCache.configs || parsedCache.data || [])

          // Converter formato de configuração para formato de tabela
          const tabelasFormatadas = configs.map((config: any) => ({
            NUTAB: config.NUTAB,
            CODTAB: config.CODTAB,
            DESCRICAO: config.DESCRICAO,
            ATIVO: config.ATIVO
          }))

          setTabelasPrecos(tabelasFormatadas)
          console.log('✅ Tabelas de preços configuradas carregadas do cache:', tabelasFormatadas.length)
          return
        } catch (e) {
          console.warn('⚠️ Erro ao processar cache de tabelas de preços configuradas')
          sessionStorage.removeItem('cached_tabelasPrecosConfig')
        }
      }

      // Se não tem cache de config, buscar da API
      const response = await fetch('/api/tabelas-precos-config')
      if (!response.ok) throw new Error('Erro ao carregar tabelas de preços configuradas')
      const data = await response.json()
      const tabelas = data.configs || []

      // Converter formato de configuração para formato de tabela
      const tabelasFormatadas = tabelas.map((config: any) => ({
        NUTAB: config.NUTAB,
        CODTAB: config.CODTAB,
        DESCRICAO: config.DESCRICAO,
        ATIVO: config.ATIVO
      }))

      setTabelasPrecos(tabelasFormatadas)
    } catch (error) {
      console.error('Erro ao carregar tabelas de preços:', error)
      toast.error("Falha ao carregar tabelas de preços. Verifique sua conexão.")
      setTabelasPrecos([])
    }
  }


  // Atualizar pedido quando tipo de pedido for selecionado
  useEffect(() => {
    if (tipoPedidoSelecionado && tiposPedido.length > 0) {
      const tipoSelecionado = tiposPedido.find(t => String(t.CODTIPOPEDIDO) === tipoPedidoSelecionado)

      if (tipoSelecionado) {
        setPedido({
          CODEMP: "1",
          CODCENCUS: "0",
          NUNOTA: "",
          MODELO_NOTA: String(tipoSelecionado.MODELO_NOTA),
          DTNEG: new Date().toISOString().split('T')[0],
          DTFATUR: "",
          DTENTSAI: "",
          CODPARC: "",
          CODTIPOPER: String(tipoSelecionado.CODTIPOPER),
          TIPMOV: tipoSelecionado.TIPMOV,
          CODTIPVENDA: String(tipoSelecionado.CODTIPVENDA),
          CODVEND: codVendUsuario,
          OBSERVACAO: "",
          VLOUTROS: 0,
          VLRDESCTOT: 0,
          VLRFRETE: 0,
          TIPFRETE: "S",
          ORDEMCARGA: "",
          CODPARCTRANSP: "0",
          PERCDESC: 0,
          CODNAT: "0",
          TIPO_CLIENTE: "PJ",
          CPF_CNPJ: "",
          IE_RG: "",
          RAZAO_SOCIAL: "",
          itens: []
        })
      }
    }
  }, [tipoPedidoSelecionado, tiposPedido, codVendUsuario])

  const handlePedidoSucesso = () => {
    toast.success("Pedido criado com sucesso!")
    onClose()
  }

  const handleCancelar = () => {
    onClose()
  }

  const handleCriarPedido = async () => {
    if (!salvarPedidoRef.current) {
      toast.error("Erro ao criar pedido. Tente novamente.")
      return
    }

    setLoading(true)
    try {
      const sucesso = await salvarPedidoRef.current()
      if (sucesso) {
        handlePedidoSucesso()
      }
    } catch (error) {
      console.error("Erro ao criar pedido:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 md:px-6 py-3 md:py-4 border-b flex-shrink-0">
          <DialogTitle className="text-base md:text-lg">Criar Pedido de Venda Rápido</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 pb-20">
          {pedido && tipoPedidoSelecionado && (
            <PedidoVendaFromLead
              dadosIniciais={pedido}
              onSuccess={handlePedidoSucesso}
              onCancel={handleCancelar}
              onSalvarPedido={(salvarFn) => {
                salvarPedidoRef.current = salvarFn
              }}
              isLeadVinculado={false}
              tabelasPrecos={tabelasPrecos}
            />
          )}
        </div>
        <div className="border-t px-4 md:px-6 py-3 md:py-4 flex-shrink-0 bg-background">
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelar}
              className="min-w-[100px]"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="min-w-[100px] bg-green-600 hover:bg-green-700"
              onClick={handleCriarPedido}
              disabled={loading || !tipoPedidoSelecionado || tiposPedido.length === 0}
            >
              {loading ? "Criando..." : "Criar Pedido"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}