"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Pencil, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PartnerModal } from "@/components/partner-modal"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/lib/auth-service"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface Partner {
  _id: string
  CODPARC: string
  NOMEPARC: string
  CGC_CPF: string
  CODCID?: string
  ATIVO?: string
  TIPPESSOA?: string
  CODVEND?: number
  CLIENTE?: string
}

interface PaginatedResponse {
  parceiros: Partner[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const ITEMS_PER_PAGE = 50

export default function PartnersTable() {
  const [searchName, setSearchName] = useState("")
  const [searchCode, setSearchCode] = useState("")
  const [appliedSearchName, setAppliedSearchName] = useState("")
  const [appliedSearchCode, setAppliedSearchCode] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [partners, setPartners] = useState<Partner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [vendedoresMap, setVendedoresMap] = useState<Record<number, string>>({})
  const [searchTerm, setSearchTerm] = useState("") // Estado para o termo de busca geral
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false)
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([])
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const loadingRef = useRef(false);


  useEffect(() => {
    loadPartners()
  }, [currentPage, appliedSearchName, appliedSearchCode])

  useEffect(() => {
    const user = authService.getCurrentUser()
    if (user) {
      setCurrentUser(user)
    }
    loadVendedores()
  }, [])

  const loadVendedores = async () => {
    try {
      const response = await fetch('/api/vendedores?tipo=todos')
      const vendedores = await response.json()
      const map: Record<number, string> = {}
      vendedores.forEach((v: any) => {
        map[v.CODVEND] = v.APELIDO
      })
      setVendedoresMap(map)
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error)
    }
  }

  const handleSearch = () => {
    setAppliedSearchName(searchName)
    setAppliedSearchCode(searchCode)
    setCurrentPage(1)
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

  const loadPartners = async () => {
    if (loadingRef.current) {
      console.log('⏭️ Requisição de loadPartners já em andamento.');
      return;
    }
    loadingRef.current = true;

    try {
      setIsLoading(true);

      // SEMPRE tentar cache primeiro
      const cached = sessionStorage.getItem('cached_parceiros');
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          const allParceiros = Array.isArray(cachedData) ? cachedData : (cachedData.parceiros || []);

          if (allParceiros.length > 0) {
            // Aplicar filtros se existirem, senão mostrar todos
            let filteredParceiros = allParceiros;

            // Só filtrar se REALMENTE houver texto nos filtros
            const hasFilters = (appliedSearchName && appliedSearchName.trim() !== '') || 
                              (appliedSearchCode && appliedSearchCode.trim() !== '');

            if (hasFilters) {
              filteredParceiros = allParceiros.filter(p => {
                const matchName = !appliedSearchName || !appliedSearchName.trim() || 
                                 p.NOMEPARC?.toLowerCase().includes(appliedSearchName.toLowerCase());
                const matchCode = !appliedSearchCode || !appliedSearchCode.trim() || 
                                 p.CODPARC?.toString().includes(appliedSearchCode);
                return matchName && matchCode;
              });
              console.log(`🔍 Filtros aplicados: ${filteredParceiros.length} de ${allParceiros.length} parceiros`);
            } else {
              console.log(`📋 Exibindo todos os ${allParceiros.length} parceiros do cache`);
            }

            // Calcular índices de paginação
            const total = filteredParceiros.length;
            const totalPgs = Math.ceil(total / ITEMS_PER_PAGE) || 1;
            const start = (currentPage - 1) * ITEMS_PER_PAGE;
            const end = Math.min(start + ITEMS_PER_PAGE, total);

            // Paginar os resultados
            const paginatedParceiros = filteredParceiros.slice(start, end);
            
            setPartners(paginatedParceiros);
            setTotalPages(totalPgs);
            setTotalRecords(total);
            setIsLoading(false);
            loadingRef.current = false;
            
            console.log(`✅ Exibindo página ${currentPage}/${totalPgs} - ${paginatedParceiros.length} parceiros (${start + 1}-${end} de ${total})`);
            return;
          }
        } catch (e) {
          console.warn('⚠️ Erro ao parsear cache de parceiros:', e);
          sessionStorage.removeItem('cached_parceiros');
        }
      }

      // Se não tem cache, exibir mensagem de offline
      console.log('⚠️ Cache não disponível - modo offline');
      toast({
        title: "Sem Dados em Cache",
        description: "Faça login novamente para sincronizar os dados.",
        variant: "default",
      });

      setPartners([]);
      setTotalPages(1);
      setTotalRecords(0);

    } catch (error) {
      console.error("Erro ao carregar parceiros:", error);

      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });

      setPartners([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }

  const handleSave = async (partnerData: any) => {
    try {
      // Remover campos vazios/undefined
      const cleanData = Object.fromEntries(
        Object.entries(partnerData).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
      );

      console.log("Frontend - Enviando dados do parceiro:", cleanData);

      if (currentUser?.role === 'Vendedor' && !cleanData.CODVEND) {
        cleanData.CODVEND = currentUser.codVendedor;
      }

      const response = await fetch('/api/sankhya/parceiros/salvar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData),
      })

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Frontend - Erro na resposta da API:", errorData);
        throw new Error(errorData.error || 'Falha ao salvar parceiro')
      }

      const resultado = await response.json();

      console.log("Frontend - Parceiro salvo com sucesso:", resultado);

      toast({
        title: "Sucesso",
        description: resultado.message || (partnerData.CODPARC
          ? "Parceiro atualizado com sucesso. Aguarde a sincronização para visualizar as alterações."
          : "Parceiro cadastrado com sucesso. Aguarde a sincronização para visualizar no sistema."),
        duration: 5000,
      })
      sessionStorage.removeItem('cached_parceiros');
      await loadPartners()
      setIsModalOpen(false)
    } catch (error: any) {
      console.error("Frontend - Erro ao salvar parceiro:", {
        message: error.message,
        dados: partnerData
      });

      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar parceiro",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (codParceiro: string) => {
    if (!confirm("Tem certeza que deseja inativar este parceiro?")) {
      return
    }

    try {
      const response = await fetch('/api/sankhya/parceiros/deletar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codParceiro })
      })

      if (!response.ok) throw new Error('Erro ao inativar parceiro')

      toast({
        title: "Sucesso",
        description: "Parceiro inativado com sucesso",
      })

      sessionStorage.removeItem('cached_parceiros');
      loadPartners()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao inativar parceiro",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (partner: any) => {
    setSelectedPartner(partner)
    requestAnimationFrame(() => {
      setIsModalOpen(true)
    })
  }

  const handleCreate = () => {
    setSelectedPartner(null)
    setIsModalOpen(true)
  }

  const handlePartnerSearch = (value: string) => {
    setSearchName(value)
    setShowPartnerDropdown(true)

    // Só filtrar se tiver 2+ caracteres
    if (value.length < 2) {
      setFilteredPartners([])
      setShowPartnerDropdown(false)
      return
    }

    try {
      const cachedParceiros = sessionStorage.getItem('cached_parceiros')
      if (cachedParceiros) {
        const parsedCache = JSON.parse(cachedParceiros)
        const allParceiros = parsedCache.parceiros || parsedCache
        const searchLower = value.toLowerCase()
        const filtered = allParceiros.filter((p: any) =>
          p.NOMEPARC?.toLowerCase().includes(searchLower) ||
          p.CGC_CPF?.includes(value) ||
          p.RAZAOSOCIAL?.toLowerCase().includes(searchLower) ||
          p.CODPARC?.toString().includes(value)
        )
        setFilteredPartners(filtered)
        console.log('✅ Parceiros filtrados (PartnersTable):', filtered.length)
      }
    } catch (error) {
      console.error('Erro ao filtrar parceiros:', error)
      setFilteredPartners([])
    }
  }

  const handlePartnerSelect = (partner: Partner) => {
    setSearchName(partner.NOMEPARC)
    setShowPartnerDropdown(false)
  }

  const handleViewDetails = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Desktop */}
      <div className="hidden md:block border-b p-6">
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Consulta e gerenciamento de clientes
        </p>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden border-b p-4">
        <h1 className="text-xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Consulta e gerenciamento de clientes
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
                  Código do Parceiro
                </Label>
                <Input
                  id="searchCode"
                  type="text"
                  placeholder="Digite o código"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="searchName" className="text-xs md:text-sm font-medium">
                  Nome do Parceiro
                </Label>
                <Input
                  id="searchName"
                  type="text"
                  placeholder="Digite o nome"
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
                  {isLoading ? 'Buscando...' : 'Buscar Clientes'}
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
                    Código do Parceiro
                  </Label>
                  <Input
                    id="searchCodeMobile"
                    type="text"
                    placeholder="Digite o código"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="searchNameMobile" className="text-xs md:text-sm font-medium">
                    Nome do Parceiro
                  </Label>
                  <Input
                    id="searchNameMobile"
                    type="text"
                    placeholder="Digite o nome"
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
                  {isLoading ? 'Buscando...' : 'Buscar Clientes'}
                </Button>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Tabela de Clientes - Full Width */}
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
                    Nome
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden lg:table-cell">
                    CPF/CNPJ
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-3 md:px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        <p className="text-sm font-medium text-muted-foreground">Carregando clientes...</p>
                      </div>
                    </td>
                  </tr>
                ) : partners.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 md:px-6 py-8 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado. Use os filtros acima para buscar.
                    </td>
                  </tr>
                ) : (
                  partners.map((partner) => (
                    <tr key={partner.CODPARC} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm font-medium text-foreground">{partner.CODPARC}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground">{partner.NOMEPARC}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground hidden lg:table-cell">{partner.CGC_CPF || '-'}</td>
                      <td className="px-3 md:px-6 py-4">
                        <Button
                          size="sm"
                          onClick={() => handleViewDetails(partner)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase text-[10px] md:text-xs flex items-center gap-1 px-2 md:px-3"
                        >
                          <span className="hidden sm:inline">Ver Detalhes</span>
                          <span className="sm:hidden">Detalhes</span>
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

      {/* Pagination - Moved outside the CardContent to be always visible */}
      {!isLoading && partners.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t bg-card">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} a {endIndex} de {totalRecords} clientes
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

      <PartnerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        partner={selectedPartner}
        onSave={handleSave}
        currentUser={currentUser}
      />
    </div>
  )
}