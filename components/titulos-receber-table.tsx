"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface Titulo {
  nroTitulo: string
  parceiro: string
  valor: number
  dataVencimento: string
  dataNegociacao: string
  tipo: string // Real ou Provisão
  status: string // Aberto ou Baixado
  numeroParcela: number
  // Adicionando campos que podem vir do cache e são usados na filtragem
  CODPARC?: string | number;
  NOMEPARC?: string;
  DTVENC?: string;
}

export default function TitulosReceberTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchNroTitulo, setSearchNroTitulo] = useState("")
  const [titulos, setTitulos] = useState<Titulo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  

  const loadTitulos = async () => {
    try {
      setIsLoading(true)

      // SEMPRE tentar cache primeiro
      const cached = sessionStorage.getItem('cached_financeiro');
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          // Garantindo que é um array
          const allTitulos = Array.isArray(cachedData) ? cachedData : [];

          console.log(`📊 Cache de financeiro contém ${allTitulos.length} títulos`);

          if (allTitulos.length > 0) {
            // Se tem filtros, aplicar no cache
            let filteredTitulos = allTitulos;

            // Aplicar filtros se fornecidos
            if (searchTerm || searchNroTitulo) {
              filteredTitulos = allTitulos.filter((t: any) => {
                // Mapear campos do Oracle para interface Titulo
                const nroTitulo = t.NUFIN?.toString() || '';
                const codParc = t.CODPARC?.toString() || '';
                const nomeParceiro = t.NOMEPARC || '';

                // Verificar filtro de número de título
                const matchNroTitulo = !searchNroTitulo || nroTitulo.includes(searchNroTitulo);

                // Verificar filtro de parceiro (código ou nome)
                const matchParceiro = !searchTerm || 
                  codParc.includes(searchTerm) || 
                  nomeParceiro.toLowerCase().includes(searchTerm.toLowerCase());

                return matchNroTitulo && matchParceiro;
              });
            }

            // Mapear para formato esperado pela tabela
            const titulosMapeados = filteredTitulos.map((t: any) => {
              // Determinar se está baixado (tem data de baixa OU valor de baixa)
              const estaBaixado = t.DHBAIXA || (t.VLRBAIXA && parseFloat(t.VLRBAIXA) > 0);
              
              // Valor correto: se baixado usa VLRBAIXA, senão usa VLRDESDOB
              const valorTitulo = estaBaixado 
                ? parseFloat(t.VLRBAIXA || 0)
                : parseFloat(t.VLRDESDOB || 0);
              
              return {
                nroTitulo: t.NUFIN?.toString() || '',
                parceiro: t.NOMEPARC || `Parceiro ${t.CODPARC}`,
                valor: valorTitulo,
                dataVencimento: t.DTVENC ? new Date(t.DTVENC).toISOString().split('T')[0] : '',
                dataNegociacao: t.DTNEG ? new Date(t.DTNEG).toISOString().split('T')[0] : '',
                tipo: t.PROVISAO === 'S' ? 'Provisão' : 'Real',
                status: estaBaixado ? 'Baixado' : 'Aberto',
                numeroParcela: 1
              };
            });

            setTitulos(titulosMapeados);
            console.log(`✅ ${titulosMapeados.length} título(s) encontrado(s) no cache`);

            if (titulosMapeados.length > 0) {
              toast({
                title: "Sucesso",
                description: `${titulosMapeados.length} título(s) encontrado(s)`,
              });
            } else {
              toast({
                title: "Nenhum resultado",
                description: "Nenhum título encontrado com os filtros aplicados",
              });
            }
            return;
          }
        } catch (e) {
          console.warn('⚠️ Erro ao parsear cache de títulos financeiros:', e);
        }
      }

      // Se não tem cache, exibir mensagem
      console.log('⚠️ Cache não disponível - faça login para sincronizar');
      toast({
        title: "Sem dados em cache",
        description: "Faça login novamente para sincronizar os dados.",
        variant: "default",
      });

      setTitulos([]);

    } catch (error) {
      console.error("Erro ao carregar títulos:", error)
      toast({
        title: "Erro",
        description: "Erro ao buscar títulos a receber.",
        variant: "destructive",
      })
      setTitulos([])
    } finally {
      setIsLoading(false)
    }
  }

  // Removido - usuário deve clicar no botão "Buscar Títulos"

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-' // Verifica se a data é válida
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Desktop */}
      <div className="hidden md:block border-b p-6">
        <h1 className="text-3xl font-bold tracking-tight">Títulos a Receber</h1>
        <p className="text-muted-foreground">
          Consulta de títulos financeiros a receber
        </p>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden border-b p-4">
        <h1 className="text-xl font-bold">Títulos a Receber</h1>
        <p className="text-sm text-muted-foreground">
          Consulta de títulos financeiros a receber
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
                <Label htmlFor="searchTerm" className="text-xs md:text-sm font-medium">
                  Nome do Parceiro / Código
                </Label>
                <Input
                  id="searchTerm"
                  type="text"
                  placeholder="Buscar por nome ou código"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              {/* Campo de Número do Título mantido */}
              <div className="space-y-1.5">
                <Label htmlFor="searchNroTitulo" className="text-xs md:text-sm font-medium">
                  Número do Título
                </Label>
                <Input
                  id="searchNroTitulo"
                  type="text"
                  placeholder="Buscar por número"
                  value={searchNroTitulo}
                  onChange={(e) => setSearchNroTitulo(e.target.value)}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5 md:self-end">
                <Label className="text-xs md:text-sm font-medium opacity-0 hidden md:block">Ação</Label>
                <Button
                  onClick={loadTitulos}
                  disabled={isLoading}
                  className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Buscando...' : 'Buscar Títulos'}
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
                  <Label htmlFor="searchTermMobile" className="text-xs md:text-sm font-medium">
                    Nome do Parceiro / Código
                  </Label>
                  <Input
                    id="searchTermMobile"
                    type="text"
                    placeholder="Buscar por nome ou código"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="searchNroTituloMobile" className="text-xs md:text-sm font-medium">
                    Número do Título
                  </Label>
                  <Input
                    id="searchNroTituloMobile"
                    type="text"
                    placeholder="Buscar por número"
                    value={searchNroTitulo}
                    onChange={(e) => setSearchNroTitulo(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>

                <Button
                  onClick={loadTitulos}
                  disabled={isLoading}
                  className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Buscando...' : 'Buscar Títulos'}
                </Button>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Tabela de Títulos - Full Width */}
      <div className="flex-1 overflow-auto p-0 md:p-6 mt-4 md:mt-0">
        <div className="md:rounded-lg md:border md:shadow md:bg-card">
          <div className="overflow-x-auto md:overflow-y-auto md:max-h-[calc(100vh-400px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
                <tr>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Nº Título
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Parceiro
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden lg:table-cell">
                    Vencimento
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden xl:table-cell">
                    Negociação
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-3 md:px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        <p className="text-sm font-medium text-muted-foreground">Carregando títulos...</p>
                      </div>
                    </td>
                  </tr>
                ) : titulos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 md:px-6 py-8 text-center text-sm text-muted-foreground">
                      Nenhum título encontrado. Use os filtros acima para buscar.
                    </td>
                  </tr>
                ) : (
                  titulos.map((titulo, index) => (
                    <tr key={`titulo-${titulo.nroTitulo}-${titulo.numeroParcela}-${index}`} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm font-medium text-foreground">{titulo.nroTitulo}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground max-w-[200px] truncate">{titulo.parceiro}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm font-semibold text-foreground">{formatCurrency(titulo.valor)}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground hidden lg:table-cell">{formatDate(titulo.dataVencimento)}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground hidden xl:table-cell">{formatDate(titulo.dataNegociacao)}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm">
                        <Badge className={titulo.tipo === 'Real' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                          {titulo.tipo}
                        </Badge>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm">
                        <Badge className={titulo.status === 'Baixado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {titulo.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}