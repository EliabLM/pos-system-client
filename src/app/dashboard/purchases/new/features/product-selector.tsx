"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useActiveProducts } from "@/hooks/useProducts"
import { Product } from "@/generated/prisma"

interface SelectedProduct {
  productId: string
  product: Product
  quantity: number
  unitPrice: number
  subtotal: number
}

interface ProductSelectorProps {
  selectedProducts: SelectedProduct[]
  onSelectProduct: (product: Product) => void
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ProductSelector({
  selectedProducts,
  onSelectProduct,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const { data: productsData, isLoading } = useActiveProducts({ search })

  const products: Product[] = productsData && typeof productsData === 'object' && 'products' in productsData && Array.isArray(productsData.products)
    ? productsData.products
    : Array.isArray(productsData)
    ? productsData
    : []

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(search.toLowerCase())) ||
      (product.barcode && product.barcode.toLowerCase().includes(search.toLowerCase()))
  )

  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p) => p.productId === productId)
  }

  const handleSelect = (product: Product) => {
    onSelectProduct(product)
    setSearch("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          Buscar y agregar producto...
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar por nombre, SKU o código de barras..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Cargando..." : "No se encontraron productos"}
            </CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => {
                const isSelected = isProductSelected(product.id)
                return (
                  <CommandItem
                    key={product.id}
                    value={product.id}
                    onSelect={() => handleSelect(product)}
                    disabled={isSelected}
                    className={cn(isSelected && "opacity-50")}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{product.name}</p>
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs">
                            Agregado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        {product.costPrice !== null && product.costPrice !== undefined && (
                          <span>Costo: {formatCurrency(Number(product.costPrice))}</span>
                        )}
                        <span>Stock: {product.currentStock}</span>
                      </div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
