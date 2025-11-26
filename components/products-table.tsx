"use client"

import { useState, useEffect, useRef } from "react"
import { Search, ChevronLeft, ChevronRight, Package, Eye, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EstoqueModal } from "@/components/estoque-modal"
import { useToast } from "@/hooks/use-toast"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"


interface Produto {
  _id: string
  CODPROD: string
  DESCRPROD: string
  ATIVO: string
  LOCAL?: string
  MARCA?: string
  CARACTERISTICAS?: string
  UNIDADE?: string
  VLRCOMERC?: string
  ESTOQUE?: string
  estoqueTotal?: number // Adicionado para o modal
  preco?: number       // Adicionado para o modal
  estoques?: any[]     // Adicionado para o modal
}

interface PaginatedResponse {
  produtos: Produto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const ITEMS_PER_PAGE = 20

export default function ProductsTable() {
  const [searchName, setSearchName] = useState("")
  const [searchCode, setSearchCode] = useState("")
  const [appliedSearchName, setAppliedSearchName] = useState("")
  const [appliedSearchCode, setAppliedSearchCode] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null)
  const [products, setProducts] = useState<Produto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const { toast } = useToast()
  const loadingRef = useRef(false)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false) // Estado para controlar filtros colapsáveis
  const [tabelasPrecos, setTabelasPrecos] = useState<any[]>([])
  const [tabelaSelecionada, setTabelaSelecionada] = useState<string>('0')
  const [precoProduto, setPrecoProduto] = useState<number>(0)
  const [loadingPreco, setLoadingPreco] = useState(false)


  useEffect(() => {
    if (loadingRef.current) {
      console.log('⏭️ Pulando requisição duplicada (Strict Mode)')
      return
    }

    loadingRef.current = true
    loadProducts().finally(() => {
      loadingRef.current = false
    })
  }, [currentPage])

  // Carregar produtos do cache ao montar o componente
  useEffect(() => {
    const cached = sessionStorage.getItem('cached_produtos')
    if (cached) {
      try {
        const parsedData = JSON.parse(cached)
        // Verifica se o cache é um array de produtos ou um objeto com a propriedade 'produtos'
        const allProdutos = Array.isArray(parsedData) ? parsedData : (parsedData.produtos || [])

        if (allProdutos.length > 0) {
          console.log('✅ Carregando produtos iniciais do cache:', allProdutos.length)
          // Define os produtos iniciais com base no cache e no ITEMS_PER_PAGE
          setProducts(allProdutos.slice(0, ITEMS_PER_PAGE));
          setTotalPages(Math.ceil(allProdutos.length / ITEMS_PER_PAGE));
          setTotalRecords(allProdutos.length);
          setIsLoading(false); // Define isLoading como false após carregar do cache
        }
      } catch (e) {
        console.error('Erro ao carregar cache inicial de produtos:', e)
        sessionStorage.removeItem('cached_produtos'); // Remove cache inválido
      }
    } else {
      // Se não houver cache, carrega da API normalmente
      loadProducts();
    }
  }, []); // Executa apenas uma vez ao montar o componente

  useEffect(() => {
    carregarTabelasPrecos()
  }, [])

  const carregarTabelasPrecos = async () => {
    try {
      // Buscar do cache primeiro
      const cached = sessionStorage.getItem('cached_tabelasPrecosConfig')
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached)
          const configs = Array.isArray(parsedCache) ? parsedCache : (parsedCache.configs || parsedCache.data || [])
          
          const tabelasFormatadas = configs.map((config: any) => ({
            NUTAB: config.NUTAB,
            CODTAB: config.CODTAB,
            DESCRICAO: config.DESCRICAO,
            ATIVO: config.ATIVO
          }))
          
          setTabelasPrecos(tabelasFormatadas)
          if (tabelasFormatadas.length > 0) {
            setTabelaSelecionada(String(tabelasFormatadas[0].NUTAB))
          }
          console.log('✅ Tabelas de preços configuradas carregadas do cache:', tabelasFormatadas.length)
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
      
      const tabelasFormatadas = tabelas.map((config: any) => ({
        NUTAB: config.NUTAB,
        CODTAB: config.CODTAB,
        DESCRICAO: config.DESCRICAO,
        ATIVO: config.ATIVO
      }))
      
      setTabelasPrecos(tabelasFormatadas)
      if (tabelasFormatadas.length > 0) {
        setTabelaSelecionada(String(tabelasFormatadas[0].NUTAB))
      }
    } catch (error) {
      console.error('Erro ao carregar tabelas de preços configuradas:', error)
      setTabelasPrecos([])
    }
  }

  const buscarPrecoProduto = async (codProd: string, nutab: string) => {
    if (!codProd || !nutab) return

    setLoadingPreco(true)
    try {
      const cached = sessionStorage.getItem('cached_excecoes_precos')
      if (cached) {
        const excecoesData = JSON.parse(cached)
        const excecoes = Array.isArray(excecoesData) ? excecoesData : (excecoesData.data || [])
        const excecao = excecoes.find((e: any) => 
          String(e.CODPROD) === String(codProd) && 
          String(e.NUTAB) === String(nutab)
        )
        if (excecao && excecao.VLRVENDA) {
          setPrecoProduto(parseFloat(excecao.VLRVENDA))
          setLoadingPreco(false)
          return
        }
      }

      const response = await fetch(`/api/oracle/preco?codProd=${codProd}&nutab=${nutab}`)
      if (!response.ok) throw new Error('Erro ao buscar preço')
      const data = await response.json()
      setPrecoProduto(data.preco || 0)
    } catch (error) {
      console.error('Erro ao buscar preço:', error)
      setPrecoProduto(0)
    } finally {
      setLoadingPreco(false)
    }
  }


  const handleSearch = () => {
    setAppliedSearchName(searchName)
    setAppliedSearchCode(searchCode)
    setCurrentPage(1)
    setTimeout(() => {
      loadProducts()
    }, 0)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords)

  const loadProducts = async () => {
    // Verifica se já estamos carregando para evitar requisições duplicadas
    if (loadingRef.current) {
      console.log('⏭️ Requisição de loadProducts já em andamento.');
      return;
    }
    loadingRef.current = true;

    try {
      setIsLoading(true);

      // SEMPRE tentar cache primeiro
      const cached = sessionStorage.getItem('cached_produtos');
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          const allProdutos = Array.isArray(cachedData) ? cachedData : (cachedData.produtos || []);

          if (allProdutos.length > 0) {
            // Se tem filtros, aplicar no cache
            let filteredProdutos = allProdutos;

            if (appliedSearchName || appliedSearchCode) {
              filteredProdutos = allProdutos.filter(p => {
                const matchName = !appliedSearchName || p.DESCRPROD?.toLowerCase().includes(appliedSearchName.toLowerCase());
                const matchCode = !appliedSearchCode || p.CODPROD?.toString().includes(appliedSearchCode);
                return matchName && matchCode;
              });
            }

            const paginatedProdutos = filteredProdutos.slice(startIndex, endIndex);
            setProducts(paginatedProdutos);
            setTotalPages(Math.ceil(filteredProdutos.length / ITEMS_PER_PAGE));
            setTotalRecords(filteredProdutos.length);
            setIsLoading(false);
            loadingRef.current = false;
            console.log(`✅ Usando cache com ${filteredProdutos.length} produtos (${allProdutos.length} total) para a página ${currentPage}`);
            return;
          }
        } catch (e) {
          console.warn('⚠️ Erro ao parsear cache de produtos');
        }
      }

      // Se não tem cache, tentar API
      console.log('🔍 Cache vazio, tentando buscar da API...');
      const hasSearch = appliedSearchName || appliedSearchCode;
      const url = `/api/sankhya/produtos?page=${currentPage}&pageSize=${ITEMS_PER_PAGE}&searchName=${appliedSearchName}&searchCode=${appliedSearchCode}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Falha ao carregar produtos: ${response.status}`);
      }

      const data: PaginatedResponse = await response.json();

      // Cachear resposta se for a primeira página e sem filtros
      if (currentPage === 1 && !appliedSearchName && !appliedSearchCode) {
        try {
          sessionStorage.setItem('cached_produtos', JSON.stringify(data.produtos));
          console.log('✅ Produtos cacheados da API');
        } catch (e) {
          console.error("Erro ao salvar no cache:", e);
        }
      }

      setProducts(data.produtos || []);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.total || 0);

    } catch (error) {
      console.error("Erro ao carregar produtos:", error);

      // Se falhar, tentar usar cache mesmo com filtros
      const cached = sessionStorage.getItem('cached_produtos');
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          const allProdutos = Array.isArray(cachedData) ? cachedData : (cachedData.produtos || []);

          if (allProdutos.length > 0) {
            console.log('⚠️ Usando cache offline devido a erro de conexão');
            let filteredProdutos = allProdutos;

            if (appliedSearchName || appliedSearchCode) {
              filteredProdutos = allProdutos.filter(p => {
                const matchName = !appliedSearchName || p.DESCRPROD?.toLowerCase().includes(appliedSearchName.toLowerCase());
                const matchCode = !appliedSearchCode || p.CODPROD?.toString().includes(appliedSearchCode);
                return matchName && matchCode;
              });
            }

            const paginatedProdutos = filteredProdutos.slice(startIndex, endIndex);
            setProducts(paginatedProdutos);
            setTotalPages(Math.ceil(filteredProdutos.length / ITEMS_PER_PAGE));
            setTotalRecords(filteredProdutos.length);

            toast({
              title: "Modo Offline",
              description: "Exibindo dados em cache. Conecte-se para atualizar.",
              variant: "default",
            });
            return;
          }
        } catch (e) {
          console.error("Erro ao usar cache de fallback:", e);
        }
      }

      // Se não tem cache, exibir erro
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Erro de Tempo Limite",
          description: "A requisição demorou muito. Verifique sua conexão.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Sem conexão e sem dados em cache.",
          variant: "destructive",
        });
      }

      setProducts([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }

  const abrirModal = async (produto: any) => {
    setSelectedProduct(produto)
    setIsModalOpen(true)
    setPrecoProduto(0)

    try {
      const response = await fetch(`/api/oracle/estoque?codProd=${produto.CODPROD}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedProduct({
          ...produto,
          estoqueTotal: data.estoqueTotal || 0,
          estoques: data.estoques || []
        })
      }
    } catch (error) {
      console.error('Erro ao buscar estoque:', error)
    }

    // Buscar preço inicial se tiver tabela selecionada
    if (tabelaSelecionada && tabelaSelecionada !== '0') {
      buscarPrecoProduto(produto.CODPROD, tabelaSelecionada)
    } else if (tabelaSelecionada === '0') {
      // Se a tabela selecionada for '0' (padrão), buscar o preço padrão
      buscarPrecoProduto(produto.CODPROD, '0');
    }
  }

  const formatCurrency = (value: number | undefined | string) => {
    if (value === undefined || value === null) return 'R$ 0,00'
    let numValue: number;
    if (typeof value === 'string') {
      numValue = parseFloat(value.replace(',', '.')); // Tenta converter strings com vírgula decimal
      if (isNaN(numValue)) {
        numValue = 0; // Se a conversão falhar, usa 0
      }
    } else {
      numValue = value;
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Desktop */}
      <div className="hidden md:block border-b p-6">
        <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
        <p className="text-muted-foreground">
          Consulta e gerenciamento de produtos
        </p>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden border-b p-4">
        <h1 className="text-xl font-bold">Produtos</h1>
        <p className="text-sm text-muted-foreground">
          Consulta e gerenciamento de produtos
        </p>
      </div>

      {/* Filtros de Busca - Desktop */}
      <div className="hidden md:block border-b p-6">
        <Card>
          <CardHeader>
            <CardTitle>Filtros de Busca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="searchCode" className="text-xs md:text-sm font-medium">
                  Código
                </Label>
                <Input
                  id="searchCode"
                  type="text"
                  placeholder="Buscar por código"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="searchName" className="text-xs md:text-sm font-medium">
                  Descrição
                </Label>
                <Input
                  id="searchName"
                  type="text"
                  placeholder="Buscar por descrição"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5 md:self-end">
                <Label className="text-xs md:text-sm font-medium opacity-0 hidden md:block">Ação</Label>
                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Buscando...' : 'Buscar Produtos'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros de Busca - Mobile (Colapsável) */}
      <div className="md:hidden border-b">
        <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
            >
              <span className="font-medium">Filtros de Busca</span>
              {filtrosAbertos ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card>
              <CardContent className="p-4 space-y-4 bg-muted/30">
                <div className="space-y-1.5">
                  <Label htmlFor="searchCodeMobile" className="text-xs md:text-sm font-medium">
                    Código
                  </Label>
                  <Input
                    id="searchCodeMobile"
                    type="text"
                    placeholder="Buscar por código"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="searchNameMobile" className="text-xs md:text-sm font-medium">
                    Descrição
                  </Label>
                  <Input
                    id="searchNameMobile"
                    type="text"
                    placeholder="Buscar por descrição"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Buscando...' : 'Buscar Produtos'}
                </Button>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {(appliedSearchName || appliedSearchCode) && (
        <div className="md:hidden p-4">
          <Button
            onClick={() => {
              setSearchName("")
              setSearchCode("")
              setAppliedSearchName("")
              setAppliedSearchCode("")
              setCurrentPage(1)
              setTimeout(() => {
                loadProducts()
              }, 0)
            }}
            variant="outline"
            className="w-full"
          >
            Limpar Filtros
          </Button>
        </div>
      )}

      {/* Tabela de Produtos - Full Width */}
      <div className="flex-1 overflow-auto p-0 md:p-6 mt-4 md:mt-0">
        <div className="md:rounded-lg md:border md:shadow md:bg-card">
          <div className="overflow-x-auto md:overflow-y-auto md:max-h-[calc(100vh-400px)]">
            <table className="w-full">
                  <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
                    <tr>
                      <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden lg:table-cell">
                        Marca
                      </th>
                      <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden xl:table-cell">
                        Unidade
                      </th>
                      <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-3 md:px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <p className="text-sm font-medium text-muted-foreground">Carregando produtos...</p>
                          </div>
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 md:px-6 py-4 text-center text-sm text-muted-foreground">
                          Nenhum produto encontrado
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product._id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground">{product.CODPROD}</td>
                          <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground">{product.DESCRPROD}</td>
                          <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground hidden lg:table-cell">{product.MARCA || '-'}</td>
                          <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground hidden xl:table-cell">{product.UNIDADE || '-'}</td>
                          <td className="px-3 md:px-6 py-4">
                            <Button
                              size="sm"
                              onClick={() => abrirModal(product)}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase text-[10px] md:text-xs flex items-center gap-1 px-2 md:px-3"
                            >
                              <Package className="w-3 h-3" />
                              <span className="hidden sm:inline">Detalhes</span>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        </div>

      {/* Pagination */}
      {!isLoading && products.length > 0 && (
        <div className="flex flex-col items-center justify-center gap-3 bg-card rounded-lg shadow px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {endIndex} de {totalRecords} produtos
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedProduct.CODPROD} - {selectedProduct.DESCRPROD}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Marca</p>
                  <p className="font-medium">{selectedProduct.MARCA || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unidade</p>
                  <p className="font-medium">{selectedProduct.UNIDADE || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estoque Total</p>
                  <p className="font-medium text-green-600">{selectedProduct.estoqueTotal?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tabela de Preço</p>
                  <Select
                    value={tabelaSelecionada}
                    onValueChange={(value) => {
                      console.log(`📋 Tabela selecionada: ${value}`)
                      setTabelaSelecionada(value)
                      if (selectedProduct && selectedProduct.CODPROD) {
                        buscarPrecoProduto(selectedProduct.CODPROD, value)
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione uma tabela">
                        {tabelaSelecionada === '0' ? 'Padrão (NUTAB 0)' : 
                          tabelasPrecos.find(t => String(t.NUTAB) === tabelaSelecionada) ? 
                            `${tabelasPrecos.find(t => String(t.NUTAB) === tabelaSelecionada)?.CODTAB} - NUTAB ${tabelaSelecionada}${tabelasPrecos.find(t => String(t.NUTAB) === tabelaSelecionada)?.DESCRICAO ? ` - ${tabelasPrecos.find(t => String(t.NUTAB) === tabelaSelecionada)?.DESCRICAO}` : ''}` : 
                            'Selecione uma tabela'
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Padrão (NUTAB 0)</SelectItem>
                      {tabelasPrecos.map((tabela) => (
                        <SelectItem key={tabela.NUTAB} value={String(tabela.NUTAB)}>
                          {tabela.CODTAB} - NUTAB {tabela.NUTAB}{tabela.DESCRICAO ? ` - ${tabela.DESCRICAO}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Preço Unit.</p>
                {loadingPreco ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Carregando...</span>
                  </div>
                ) : (
                  <p className="font-medium text-lg text-green-600">
                    {formatCurrency(precoProduto)}
                  </p>
                )}
              </div>

              <Button onClick={() => setIsModalOpen(false)} className="w-full bg-green-600 hover:bg-green-700">
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}