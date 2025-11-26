"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { EstoqueModal } from "@/components/estoque-modal"
import { toast } from "sonner"

interface ProdutoSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (produto: any, preco: number, quantidade: number) => void
  titulo?: string
}

interface TabelaPreco {
  NUTAB: number
  CODTAB: number
  DTVIGOR?: string
  PERCENTUAL?: number
}

interface Produto {
  CODPROD?: string;
  DESCRPROD?: string;
  MARCA?: string;
  AD_VLRUNIT?: number;
}

export function ProdutoSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  titulo = "Adicionar Produto"
}: ProdutoSelectorModalProps) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showEstoqueModal, setShowEstoqueModal] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [produtoEstoque, setProdutoEstoque] = useState<number>(0)
  const [produtoPreco, setProdutoPreco] = useState<number>(0)
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPreco[]>([])
  const [tabelaSelecionada, setTabelaSelecionada] = useState<string>('0')
  const [loadingPreco, setLoadingPreco] = useState(false); // State to track price loading


  const buscarProdutos = async (termo: string) => {
    console.log('🔍 buscarProdutos chamado com:', termo);

    // Validar se tabela de preço foi selecionada
    if (!tabelaSelecionada || tabelaSelecionada === '') {
      toast.error("Selecione uma tabela de preço antes de buscar produtos")
      return
    }

    if (termo.length < 2) {
      console.log('⚠️ Termo muito curto, limpando lista');
      setProdutos([])
      return
    }

    try {
      setIsLoading(true)
      console.log('⏳ Iniciando busca no cache...');

      // Buscar APENAS do cache local
      const cachedProdutos = sessionStorage.getItem('cached_produtos')
      if (cachedProdutos) {
        try {
          const parsedData = JSON.parse(cachedProdutos)
          console.log('📦 Tipo de dados do cache:', typeof parsedData, Array.isArray(parsedData))

          // O cache pode vir como objeto com propriedade 'produtos' ou diretamente como array
          const allProdutos = Array.isArray(parsedData) ? parsedData : (parsedData.produtos || [])
          console.log('📊 Total de produtos no cache:', allProdutos.length)

          const termoLower = termo.toLowerCase()

          const filtered = allProdutos.filter((p: Produto) => {
            const matchDescr = p.DESCRPROD?.toLowerCase().includes(termoLower)
            const matchCod = p.CODPROD?.toString().includes(termo)
            return matchDescr || matchCod
          }).slice(0, 20)

          console.log('✅ Produtos filtrados:', filtered.length)
          setProdutos(filtered)
        } catch (e) {
          console.error('❌ Erro ao processar cache:', e);
          setProdutos([])
        }
      } else {
        console.warn('⚠️ Cache de produtos não encontrado. Faça login novamente para sincronizar.');
        setProdutos([])
      }
    } catch (error) {
      console.error('❌ Erro ao buscar produtos do cache:', error)
      setProdutos([])
    } finally {
      setIsLoading(false)
      console.log('🏁 Busca finalizada');
    }
  }

  const buscarProdutosComDebounce = (() => {
    let timer: NodeJS.Timeout
    return (termo: string) => {
      console.log('⏱️ Debounce chamado com:', termo);
      clearTimeout(timer)
      timer = setTimeout(() => {
        console.log('✅ Debounce executando busca para:', termo);
        buscarProdutos(termo)
      }, 500)
    }
  })()

  const handleSelecionarProduto = async (produto: Produto) => {
    console.log('🔍 Selecionando produto:', produto.CODPROD)
    setProdutoSelecionado(produto)
    setIsLoading(true)

    try {
      // Validar se tabela de preço foi selecionada
      if (!tabelaSelecionada || tabelaSelecionada === '') {
        toast.error("Selecione uma tabela de preço antes de adicionar produtos")
        setIsLoading(false)
        return
      }

      // Tentar buscar do cache primeiro
      const cachedEstoques = sessionStorage.getItem('cached_estoques');
      const cachedExcecoesPrecos = sessionStorage.getItem('cached_excecoesPrecos');

      console.log('🔍 Cache de estoques encontrado:', !!cachedEstoques);
      console.log('🔍 Cache de exceções de preços encontrado:', !!cachedExcecoesPrecos);
      console.log('🔍 Tabela selecionada:', tabelaSelecionada);
      console.log('🔍 Código do produto:', produto.CODPROD);

      let estoqueTotal = 0;
      let preco = 0;

      // Buscar estoque do cache
      if (cachedEstoques) {
        try {
          const estoquesData = JSON.parse(cachedEstoques);
          const estoques = Array.isArray(estoquesData) ? estoquesData : (estoquesData.data || []);
          const produtoEstoques = estoques.filter((e: any) => String(e.CODPROD) === String(produto.CODPROD));
          estoqueTotal = produtoEstoques.reduce((sum: number, e: any) => sum + (parseFloat(e.ESTOQUE) || 0), 0);
          console.log('📦 Estoque do cache:', estoqueTotal);
        } catch (e) {
          console.warn('⚠️ Erro ao buscar estoque do cache:', e);
        }
      }

      // Buscar preço do cache de exceções
      if (cachedExcecoesPrecos) {
        try {
          const excecoesData = JSON.parse(cachedExcecoesPrecos);
          const excecoes = Array.isArray(excecoesData) ? excecoesData : (excecoesData.data || []);

          console.log('🔍 Total de exceções no cache:', excecoes.length);
          console.log('🔍 Buscando exceção para CODPROD:', produto.CODPROD, 'NUTAB:', tabelaSelecionada);

          const excecao = excecoes.find((e: any) => {
            const matchProduto = String(e.CODPROD) === String(produto.CODPROD);
            const matchTabela = String(e.NUTAB) === String(tabelaSelecionada);
            return matchProduto && matchTabela;
          });

          if (excecao) {
            preco = parseFloat(excecao.VLRVENDA || '0');
            console.log('💰 Preço encontrado na exceção do cache:', preco);
          } else {
            console.warn('⚠️ Nenhuma exceção de preço encontrada para este produto e tabela');
            console.log('🔍 Amostra de exceções:', excecoes.slice(0, 3));
          }
        } catch (e) {
          console.error('❌ Erro ao buscar preço do cache:', e);
        }
      } else {
        console.warn('⚠️ Cache de exceções de preços não disponível');
      }

      // Se não encontrou preço no cache, tentar buscar da API
      if (preco === 0) {
        console.log('🌐 Preço não encontrado no cache, buscando da API...');
        try {
          const response = await fetch(`/api/oracle/preco?codProd=${produto.CODPROD}&nutab=${tabelaSelecionada}`);
          if (response.ok) {
            const data = await response.json();
            preco = parseFloat(data.preco || '0');
            console.log('💰 Preço obtido da API:', preco);
          }
        } catch (apiError) {
          console.error('❌ Erro ao buscar preço da API:', apiError);
        }
      }

      setProdutoEstoque(estoqueTotal)
      setProdutoPreco(preco)
      setShowEstoqueModal(true)

      console.log('✅ Dados carregados - Estoque:', estoqueTotal, 'Preço:', preco);

    } catch (error: any) {
      console.error('❌ Erro ao carregar dados do produto:', error)

      // Usar valores padrão
      console.warn('⚠️ Usando valores padrão')
      setProdutoEstoque(0)
      setProdutoPreco(0)
      setShowEstoqueModal(true)
      toast.error('Erro ao carregar preço do produto')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmarEstoque = (produto: any, preco: number, quantidade: number) => {
    setShowEstoqueModal(false)
    setProdutoSelecionado(null)
    setProdutoEstoque(0)
    setProdutoPreco(0)
    onConfirm(produto, preco, quantidade)
    setProdutos([])
    onClose()
  }

  const handleCancelarEstoque = () => {
    setShowEstoqueModal(false)
    setProdutoSelecionado(null)
    setProdutoEstoque(0)
    setProdutoPreco(0)
  }

  const carregarTabelasPrecos = async () => {
    try {
      // Buscar do cache primeiro
      const cached = sessionStorage.getItem('cached_tabelasPrecosConfig')
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached)
          const configs = Array.isArray(parsedCache) ? parsedCache : (parsedCache.configs || parsedCache.data || [])

          // Converter formato de configuração para formato de tabela
          const tabelasFormatadas = configs.map((config: any) => ({
            NUTAB: config.NUTAB,
            CODTAB: config.CODTAB,
            DESCRICAO: config.DESCRICAO,
            ATIVO: config.ATIVO
          }))

          setTabelasPreco(tabelasFormatadas)
          console.log('✅ Tabelas de preço configuradas carregadas do cache:', tabelasFormatadas.length)

          // Definir a primeira tabela como selecionada por padrão, se houver
          if (tabelasFormatadas.length > 0 && !tabelaSelecionada) {
            setTabelaSelecionada(String(tabelasFormatadas[0].NUTAB))
          }
          return
        } catch (e) {
          console.warn('⚠️ Erro ao processar cache de tabelas de preços configuradas')
          sessionStorage.removeItem('cached_tabelasPrecosConfig')
        }
      }

      // Se não houver cache, buscar da API
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

      setTabelasPreco(tabelasFormatadas)
      console.log('✅ Tabelas de preço configuradas carregadas:', tabelasFormatadas.length)

      // Definir a primeira tabela como selecionada por padrão, se houver
      if (tabelasFormatadas.length > 0 && !tabelaSelecionada) {
        setTabelaSelecionada(String(tabelasFormatadas[0].NUTAB))
      }
    } catch (error) {
      console.error('❌ Erro ao carregar tabelas de preços configuradas:', error)
      toast.error("Falha ao carregar tabelas de preços. Verifique as configurações.")
      setTabelasPreco([])
    }
  }

  useEffect(() => {
    if (isOpen) {
      carregarTabelasPrecos()
    } else {
      setProdutos([])
      setProdutoSelecionado(null)
      setProdutoEstoque(0)
      setProdutoPreco(0)
      setTabelaSelecionada('')
    }
  }, [isOpen])

  const buscarPrecoProduto = async (codProd: string, nutab: string) => {
    if (!codProd || !nutab) return

    setLoadingPreco(true)
    try {
      // Primeiro tenta do cache
      const cached = sessionStorage.getItem('cached_excecoes_precos')
      if (cached) {
        const excecoesData = JSON.parse(cached)
        const excecoes = Array.isArray(excecoesData) ? excecoesData : (excecoesData.data || [])
        const excecao = excecoes.find((e: any) =>
          String(e.CODPROD) === String(codProd) &&
          String(e.NUTAB) === String(nutab)
        )
        if (excecao && excecao.VLRVENDA) {
          setProdutoPreco(parseFloat(excecao.VLRVENDA))
          setLoadingPreco(false)
          return
        }
      }

      // Se não encontrar no cache, busca da API
      const response = await fetch(`/api/oracle/preco?codProd=${codProd}&nutab=${nutab}`)
      if (!response.ok) throw new Error('Erro ao buscar preço')
      const data = await response.json()
      setProdutoPreco(data.preco || 0)
    } catch (error) {
      console.error('Erro ao buscar preço:', error)
      setProdutoPreco(0)
    } finally {
      setLoadingPreco(false)
    }
  }


  return (
    <>
      <Dialog open={isOpen && !showEstoqueModal} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]" data-produto-selector style={{ zIndex: 50 }}>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {tabelasPreco.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tabela de Preço</Label>
                <Select
                  value={tabelaSelecionada}
                  onValueChange={(value) => {
                    setTabelaSelecionada(value)
                    if (produtoSelecionado?.CODPROD) {
                      buscarPrecoProduto(produtoSelecionado.CODPROD, value)
                    }
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione a tabela de preço" />
                  </SelectTrigger>
                  <SelectContent>
                    {tabelasPreco.map((tabela) => (
                      <SelectItem key={tabela.NUTAB} value={String(tabela.NUTAB)}>
                        {tabela.CODTAB} - NUTAB {tabela.NUTAB}
                        {tabela.DESCRICAO && ` - ${tabela.DESCRICAO}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Input
              placeholder={!tabelaSelecionada || tabelaSelecionada === '' ? "Selecione uma tabela de preço primeiro" : "Digite pelo menos 2 caracteres para buscar..."}
              onChange={(e) => buscarProdutosComDebounce(e.target.value)}
              className="text-sm"
              disabled={!tabelaSelecionada || tabelaSelecionada === ''}
              autoFocus={tabelaSelecionada !== '' && tabelaSelecionada !== '0'}
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {!tabelaSelecionada || tabelaSelecionada === '' ? (
                <div className="text-center py-8 text-sm text-orange-600 font-medium">
                  ⚠️ Selecione uma tabela de preço para buscar produtos
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Buscando produtos...</span>
                </div>
              ) : produtos.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Digite pelo menos 2 caracteres para buscar produtos
                </div>
              ) : (
                produtos.map((produto) => (
                  <Card
                    key={produto.CODPROD}
                    className="cursor-pointer hover:bg-green-50 transition-colors"
                    onClick={() => handleSelecionarProduto(produto)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{produto.CODPROD} - {produto.DESCRPROD}</p>
                          {produto.MARCA && (
                            <p className="text-xs text-muted-foreground mt-1">Marca: {produto.MARCA}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showEstoqueModal && (
        <EstoqueModal
          isOpen={showEstoqueModal}
          onClose={handleCancelarEstoque}
          product={produtoSelecionado}
          onConfirm={handleConfirmarEstoque}
          estoqueTotal={produtoEstoque}
          preco={loadingPreco ? 0 : produtoPreco} // Display 0 while loading price
        />
      )}
    </>
  )
}