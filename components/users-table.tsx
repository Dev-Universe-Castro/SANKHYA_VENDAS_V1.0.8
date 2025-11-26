"use client"

import { useState, useEffect } from "react"
import { Search, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { User } from "@/lib/types"
import UserModal from "./user-modal"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export default function UsersTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>("Administrador")
  const [vendedoresMap, setVendedoresMap] = useState<Record<number, string>>({})
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  useEffect(() => {
    loadUsers()
    // Buscar papel do usuário logado (adapte conforme sua lógica de autenticação)
    const userRole = localStorage.getItem('userRole') || "Administrador"
    setCurrentUserRole(userRole)
    console.log("👤 Papel do usuário carregado:", userRole)
  }, [])

  useEffect(() => {
    console.log("📊 Estado dos usuários:", {
      totalUsuarios: users.length,
      usuariosFiltrados: filteredUsers.length,
      primeiroUsuario: users.length > 0 ? users[0] : null
    })
  }, [users, filteredUsers])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredUsers(filtered)
    }
  }, [searchTerm, users])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      // Tentar carregar do cache primeiro
      const cached = sessionStorage.getItem('cached_usuarios')
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          console.log('📦 Dados BRUTOS do cache:', cachedData)
          console.log('📦 Tipo dos dados:', Array.isArray(cachedData) ? 'Array' : typeof cachedData)
          console.log('📦 Primeiro usuário:', cachedData.length > 0 ? cachedData[0] : null)
          console.log('📦 Campos do primeiro usuário:', cachedData.length > 0 ? Object.keys(cachedData[0]) : [])
          
          if (Array.isArray(cachedData) && cachedData.length > 0) {
            setUsers(cachedData)
            setFilteredUsers(cachedData)
            setIsLoading(false)
            console.log('✅ Usuários carregados do cache')
            
            // Carregar nomes de vendedores em background
            loadVendedoresNomes(cachedData)
            return
          } else {
            console.warn('⚠️ Cache vazio ou inválido, buscando da API')
          }
        } catch (e) {
          console.warn('⚠️ Erro ao parsear cache de usuários:', e)
        }
      }

      console.log('🔄 Buscando usuários da API...')
      const response = await fetch('/api/usuarios')
      if (!response.ok) throw new Error('Erro ao carregar usuários')
      const data = await response.json()
      
      console.log('📥 Dados da API:', { 
        total: data.length, 
        primeiro: data.length > 0 ? data[0] : null 
      })
      
      setUsers(data)
      setFilteredUsers(data)

      // Salvar no cache
      try {
        sessionStorage.setItem('cached_usuarios', JSON.stringify(data))
        console.log('✅ Usuários salvos no cache')
      } catch (e) {
        console.warn('⚠️ Erro ao salvar cache de usuários:', e)
      }

      // Carregar nomes de vendedores/gerentes
      await loadVendedoresNomes(data)
    } catch (error) {
      console.error("❌ Erro ao carregar usuários:", error)
      // Em caso de erro na API, tentar usar o cache se disponível
      const cached = sessionStorage.getItem('cached_usuarios')
      if (cached) {
        try {
          const cachedData = JSON.parse(cached)
          setUsers(cachedData)
          setFilteredUsers(cachedData)
          console.log('✅ Usuários carregados do cache após erro na API')
        } catch (e) {
          console.warn('⚠️ Erro ao parsear cache de usuários após erro na API')
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadVendedoresNomes = async (users: User[]) => {
    try {
      // Buscar gerentes e vendedores
      const [gerentesRes, vendedoresRes] = await Promise.all([
        fetch('/api/vendedores?tipo=gerentes'),
        fetch('/api/vendedores?tipo=vendedores')
      ])

      const gerentes = await gerentesRes.json()
      const vendedores = await vendedoresRes.json()

      const todosVendedores = [...gerentes, ...vendedores]
      const map: Record<number, string> = {}

      todosVendedores.forEach(v => {
        map[parseInt(v.CODVEND)] = v.APELIDO
      })

      setVendedoresMap(map)
    } catch (error) {
      console.error("Error loading vendedores names:", error)
    }
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setModalMode("create")
    setIsModalOpen(true)
  }

  const handleEdit = (user: User) => {
    console.log("✏️ INICIANDO EDIÇÃO - ID:", user.id)
    console.log("✏️ Dados recebidos:", {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar
    })

    // Fechar modal e limpar estado
    setIsModalOpen(false)
    setSelectedUser(null)
    setModalMode("edit")

    // Aguardar limpeza do estado
    setTimeout(() => {
      // Garantir que todos os campos existem, incluindo avatar
      const userToEdit: User = {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        role: user.role || "Vendedor",
        status: user.status || "ativo",
        password: user.password || "",
        avatar: user.avatar || ""
      }

      console.log("✏️ Definindo usuário para edição:", userToEdit)
      setSelectedUser(userToEdit)

      // Abrir modal após garantir que o estado foi atualizado
      setTimeout(() => {
        console.log("✏️ ABRINDO MODAL com dados completos")
        setIsModalOpen(true)
      }, 50)
    }, 50)
  }

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja inativar este usuário?")) {
      try {
        const response = await fetch('/api/usuarios/deletar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        })
        if (!response.ok) throw new Error('Erro ao inativar usuário')
        // Após deletar, invalida o cache para forçar o recarregamento na próxima vez
        sessionStorage.removeItem('cached_usuarios')
        await loadUsers()
      } catch (error) {
        console.error("Error inactivating user:", error)
      }
    }
  }

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch('/api/usuarios/aprovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (!response.ok) throw new Error('Erro ao aprovar usuário')
      // Após aprovar, invalida o cache
      sessionStorage.removeItem('cached_usuarios')
      await loadUsers()
    } catch (error) {
      console.error("Error approving user:", error)
    }
  }

  const handleBlock = async (id: number) => {
    if (confirm("Tem certeza que deseja bloquear este usuário?")) {
      try {
        const response = await fetch('/api/usuarios/bloquear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        })
        if (!response.ok) throw new Error('Erro ao bloquear usuário')
        // Após bloquear, invalida o cache
        sessionStorage.removeItem('cached_usuarios')
        await loadUsers()
      } catch (error) {
        console.error("Error blocking user:", error)
      }
    }
  }

  const handleSave = async (userData: Omit<User, "id"> | User) => {
    try {
      const response = await fetch('/api/usuarios/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData, mode: modalMode })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar usuário')
      }

      // Fechar modal antes de recarregar
      setIsModalOpen(false)

      // Após salvar, invalida o cache para garantir que os dados mais recentes sejam carregados
      sessionStorage.removeItem('cached_usuarios')

      // Recarregar usuários
      await loadUsers()

      console.log("✅ Usuário salvo e tabela atualizada")
    } catch (error) {
      console.error("Error saving user:", error)
      alert(`Erro ao salvar usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const getStatusBadge = (status: User["status"]) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>
      case "pendente":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>
      case "bloqueado":
        return <Badge className="bg-red-500 hover:bg-red-600">Bloqueado</Badge>
    }
  }

  const isAdmin = currentUserRole === "Administrador"

  useEffect(() => {
    console.log("👤 Papel do usuário atual:", currentUserRole)
    console.log("🔑 É administrador?", isAdmin)
  }, [currentUserRole, isAdmin])

  return (
    <div className="h-full flex flex-col">
      {/* Header - Desktop */}
      <div className="hidden md:flex justify-between items-center border-b p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerenciamento de usuários do sistema
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden border-b p-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold">Usuários</h1>
          <Button onClick={handleCreate} size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Gerenciamento de usuários do sistema
        </p>
      </div>

      {/* Filtros */}
      <div className="p-4 md:p-6 border-b">
        <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos} className="w-full rounded-md border">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Filtros</span>
              </div>
              {filtrosAbertos ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Buscar por nome, email ou perfil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="col-span-1 md:col-span-2"
              />
              {/* Adicionar mais filtros aqui se necessário */}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Tabela de Usuários - Full Width */}
      <div className="flex-1 overflow-auto p-0 md:p-6 mt-4 md:mt-0">
        <div className="md:rounded-lg md:border md:shadow md:bg-card">
          <div className="overflow-x-auto md:overflow-y-auto md:max-h-[calc(100vh-400px)]">
            <table className="w-full">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
                <tr>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Vendedor/Gerente
                  </th>
                  <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                    Status
                  </th>
                  {isAdmin && (
                    <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-3 md:px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        <p className="text-sm font-medium text-muted-foreground">Carregando usuários...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 md:px-6 py-8 text-center text-sm text-muted-foreground">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground">{user.id}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground">{user.name}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground">{user.email}</td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm">
                        <Badge variant={user.role === "Administrador" ? "default" : "secondary"} className="text-[10px] md:text-xs">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm">
                        {user.codVendedor && vendedoresMap[user.codVendedor]
                          ? vendedoresMap[user.codVendedor]
                          : '-'}
                      </td>
                      <td className="px-3 md:px-6 py-4 text-xs md:text-sm">{getStatusBadge(user.status)}</td>
                      {isAdmin && (
                        <td className="px-3 md:px-6 py-4">
                          <div className="flex gap-1 md:gap-2">
                            {user.status === "pendente" ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(user.id)}
                                  className="bg-green-500 hover:bg-green-600 text-white font-medium uppercase text-[10px] md:text-xs flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleBlock(user.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white font-medium uppercase text-[10px] md:text-xs flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  Bloquear
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleEdit(user)}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase text-[10px] md:text-xs flex items-center gap-1"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Editar
                                </Button>
                                {user.status === "ativo" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleBlock(user.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white font-medium uppercase text-[10px] md:text-xs flex items-center gap-1"
                                  >
                                    <X className="w-3 h-3" />
                                    Bloquear
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(user.id)}
                                  className="font-medium uppercase text-[10px] md:text-xs flex items-center gap-1"
                                  title="Inativar Usuário"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Inativar
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isAdmin && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          user={selectedUser}
          mode={modalMode}
        />
      )}
    </div>
  )
}