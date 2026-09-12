// import React from "react";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import SearchableSelect from "@/components/reports/SearchableSelect";

// export default function FilterBar({ filters = [], value, lookups, onChange }) {
//   const set = (patch) => onChange({ ...value, ...patch });

//   return (
//     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//       {filters.includes("company") && (
//         <div className="space-y-1.5">
//           <Label className="text-xs text-muted-foreground">Company</Label>
//           <Select
//             value={value.companyCode || ""}
//             onValueChange={(v) => set({ companyCode: v, costCenter: "ALL" })}
//           >
//             <SelectTrigger className="h-10">
//               <SelectValue placeholder="Select company" />
//             </SelectTrigger>
//             <SelectContent>
//               {(lookups.companies || []).map((c) => (
//                 <SelectItem key={c.code} value={c.code}>
//                   {c.code} - {c.name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//       )}

//       {filters.includes("costCenter") && (
//         <div className="space-y-1.5">
//           <Label className="text-xs text-muted-foreground">Cost Center</Label>
//           <Select
//             value={value.costCenter || "ALL"}
//             onValueChange={(v) => set({ costCenter: v })}
//           >
//             <SelectTrigger className="h-10">
//               <SelectValue placeholder="All" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="ALL">ALL</SelectItem>
//               {(lookups.costCenters || []).map((c) => (
//                 <SelectItem key={c.code} value={c.code}>
//                   {c.code} - {c.name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//       )}

//       {filters.includes("dateRange") && (
//         <>
//           <div className="space-y-1.5">
//             <Label className="text-xs text-muted-foreground">From Date</Label>
//             <Input
//               type="date"
//               className="h-10"
//               value={value.dateFrom || ""}
//               onChange={(e) => set({ dateFrom: e.target.value })}
//             />
//           </div>
//           <div className="space-y-1.5">
//             <Label className="text-xs text-muted-foreground">To Date</Label>
//             <Input
//               type="date"
//               className="h-10"
//               value={value.dateTo || ""}
//               onChange={(e) => set({ dateTo: e.target.value })}
//             />
//           </div>
//         </>
//       )}

//       {filters.includes("asOfDate") && (
//         <div className="space-y-1.5">
//           <Label className="text-xs text-muted-foreground">As of Date</Label>
//           <Input
//             type="date"
//             className="h-10"
//             value={value.dateTo || ""}
//             onChange={(e) =>
//               set({ dateTo: e.target.value, dateFrom: e.target.value })
//             }
//           />
//         </div>
//       )}

//       {filters.includes("account") && (
//         <div className="space-y-1.5">
//           <Label className="text-xs text-muted-foreground">
//             Account (search)
//           </Label>
//           <Input
//             list="account-list"
//             className="h-10"
//             placeholder="All accounts"
//             value={value.accountId || ""}
//             onChange={(e) => set({ accountId: e.target.value })}
//           />
//           <datalist id="account-list">
//             {(lookups.accounts || []).map((a) => (
//               <option key={a.code} value={a.code}>
//                 {a.name}
//               </option>
//             ))}
//           </datalist>
//         </div>
//       )}

//       {filters.includes("accountRange") && (
//         <>
//           <div className="space-y-1.5">
//             <Label className="text-xs text-muted-foreground">
//               Account From
//             </Label>
//             <SearchableSelect
//               value={value.accountFrom || ""}
//               placeholder="From account"
//               options={lookups.accounts || []}
//               onChange={(v) =>
//                 set({
//                   accountFrom: v,
//                   ...(value.accountTo ? {} : { accountTo: v }),
//                 })
//               }
//             />
//           </div>
//           <div className="space-y-1.5">
//             <Label className="text-xs text-muted-foreground">Account To</Label>
//             <SearchableSelect
//               value={value.accountTo || ""}
//               placeholder="To account"
//               options={lookups.accounts || []}
//               onChange={(v) => set({ accountTo: v })}
//             />
//           </div>
//         </>
//       )}

//       {filters.includes("customer") && (
//         <div className="space-y-1.5">
//           <Label className="text-xs text-muted-foreground">
//             Customer (search)
//           </Label>
//           <Input
//             list="customer-list"
//             className="h-10"
//             placeholder="All customers"
//             value={value.customerId || ""}
//             onChange={(e) => set({ customerId: e.target.value })}
//           />
//           <datalist id="customer-list">
//             {(lookups.customers || []).map((c) => (
//               <option key={c.code} value={c.code}>
//                 {c.name}
//               </option>
//             ))}
//           </datalist>
//         </div>
//       )}

//       {filters.includes("item") && (
//         <div className="space-y-1.5">
//           <Label className="text-xs text-muted-foreground">Item (search)</Label>
//           <Input
//             list="item-list"
//             className="h-10"
//             placeholder="All items"
//             value={value.itemId || ""}
//             onChange={(e) => set({ itemId: e.target.value })}
//           />
//           <datalist id="item-list">
//             {(lookups.items || []).map((i) => (
//               <option key={i.code} value={i.code}>
//                 {i.name}
//               </option>
//             ))}
//           </datalist>
//         </div>
//       )}

//       {filters.includes("customerRange") && (
//         <>
//           <div className="space-y-1.5">
//             <Label className="text-xs text-muted-foreground">
//               Customer From
//             </Label>
//             <Input
//               list="customer-list"
//               className="h-10"
//               placeholder="From customer"
//               value={value.customerFrom || ""}
//               onChange={(e) => set({ customerFrom: e.target.value })}
//             />
//             <datalist id="customer-list">
//               {(lookups.customers || []).map((c) => (
//                 <option key={c.code} value={c.code}>
//                   {c.name}
//                 </option>
//               ))}
//             </datalist>
//           </div>
//           <div className="space-y-1.5">
//             <Label className="text-xs text-muted-foreground">Customer To</Label>
//             <Input
//               list="customer-list"
//               className="h-10"
//               placeholder="To customer"
//               value={value.customerTo || ""}
//               onChange={(e) => set({ customerTo: e.target.value })}
//             />
//           </div>
//         </>
//       )}

//       {filters.includes("itemRange") && (
//         <>
//           <div className="space-y-1.5">
//             <Label className="text-xs text-muted-foreground">Item From</Label>
//             <Input
//               list="item-list"
//               className="h-10"
//               placeholder="From item"
//               value={value.itemFrom || ""}
//               onChange={(e) => set({ itemFrom: e.target.value })}
//             />
//             <datalist id="item-list">
//               {(lookups.items || []).map((i) => (
//                 <option key={i.code} value={i.code}>
//                   {i.name}
//                 </option>
//               ))}
//             </datalist>
//           </div>
//           <div className="space-y-1.5">
//             <Label className="text-xs text-muted-foreground">Item To</Label>
//             <Input
//               list="item-list"
//               className="h-10"
//               placeholder="To item"
//               value={value.itemTo || ""}
//               onChange={(e) => set({ itemTo: e.target.value })}
//             />
//           </div>
//         </>
//       )}

//       {filters.includes("vendorRange") && (
//         <>
//           <div className="space-y-1.5">
//             <Label className="text-xs text-muted-foreground">Vendor From</Label>
//             <Input
//               list="vendor-list"
//               className="h-10"
//               placeholder="From vendor"
//               value={value.vendorFrom || ""}
//               onChange={(e) => set({ vendorFrom: e.target.value })}
//             />
//             <datalist id="vendor-list">
//               {(lookups.vendors || []).map((v) => (
//                 <option key={v.code} value={v.code}>
//                   {v.name}
//                 </option>
//               ))}
//             </datalist>
//           </div>
//           <div className="space-y-1.5">
//             <Label className="text-xs text-muted-foreground">Vendor To</Label>
//             <Input
//               list="vendor-list"
//               className="h-10"
//               placeholder="To vendor"
//               value={value.vendorTo || ""}
//               onChange={(e) => set({ vendorTo: e.target.value })}
//             />
//           </div>
//         </>
//       )}

//       {filters.includes("topN") && (
//         <div className="space-y-1.5">
//           <Label className="text-xs text-muted-foreground">Top N</Label>
//           <Input
//             type="number"
//             min="1"
//             max="500"
//             className="h-10"
//             value={value.topN || 10}
//             onChange={(e) =>
//               set({ topN: parseInt(e.target.value || "10", 10) })
//             }
//           />
//         </div>
//       )}
//     </div>
//   );
// }

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchableSelect from "@/components/reports/SearchableSelect";

export default function FilterBar({ filters = [], value, lookups, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {filters.includes("company") && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Company</Label>
          <Select
            value={value.companyCode || ""}
            onValueChange={(v) => set({ companyCode: v, costCenter: "ALL" })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {(lookups.companies || []).map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filters.includes("costCenter") && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Cost Center</Label>
          <Select
            value={value.costCenter || "ALL"}
            onValueChange={(v) => set({ costCenter: v })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ALL</SelectItem>
              {(lookups.costCenters || []).map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filters.includes("dateRange") && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input
              type="date"
              className="h-10"
              value={value.dateFrom || ""}
              onChange={(e) => set({ dateFrom: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Input
              type="date"
              className="h-10"
              value={value.dateTo || ""}
              onChange={(e) => set({ dateTo: e.target.value })}
            />
          </div>
        </>
      )}

      {filters.includes("asOfDate") && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">As of Date</Label>
          <Input
            type="date"
            className="h-10"
            value={value.dateTo || ""}
            onChange={(e) =>
              set({ dateTo: e.target.value, dateFrom: e.target.value })
            }
          />
        </div>
      )}

      {filters.includes("account") && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Account (search)
          </Label>
          <SearchableSelect
            value={value.accountId || ""}
            placeholder="All accounts"
            options={lookups.accounts || []}
            onChange={(v) => set({ accountId: v })}
          />
        </div>
      )}

      {filters.includes("accountRange") && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Account From
            </Label>
            <SearchableSelect
              value={value.accountFrom || ""}
              placeholder="From account"
              options={lookups.accounts || []}
              onChange={(v) =>
                set({
                  accountFrom: v,
                  ...(value.accountTo ? {} : { accountTo: v }),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Account To</Label>
            <SearchableSelect
              value={value.accountTo || ""}
              placeholder="To account"
              options={lookups.accounts || []}
              onChange={(v) => set({ accountTo: v })}
            />
          </div>
        </>
      )}

      {filters.includes("customer") && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Customer (search)
          </Label>
          <SearchableSelect
            value={value.customerId || ""}
            placeholder="All customers"
            options={lookups.customers || []}
            onChange={(v) => set({ customerId: v })}
          />
        </div>
      )}

      {filters.includes("item") && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Item (search)</Label>
          <SearchableSelect
            value={value.itemId || ""}
            placeholder="All items"
            options={lookups.items || []}
            onChange={(v) => set({ itemId: v })}
          />
        </div>
      )}

      {filters.includes("customerRange") && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Customer From
            </Label>
            <SearchableSelect
              value={value.customerFrom || ""}
              placeholder="From customer"
              options={lookups.customers || []}
              onChange={(v) =>
                set({
                  customerFrom: v,
                  ...(value.customerTo ? {} : { customerTo: v }),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Customer To</Label>
            <SearchableSelect
              value={value.customerTo || ""}
              placeholder="To customer"
              options={lookups.customers || []}
              onChange={(v) => set({ customerTo: v })}
            />
          </div>
        </>
      )}

      {filters.includes("itemRange") && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Item From</Label>
            <SearchableSelect
              value={value.itemFrom || ""}
              placeholder="From item"
              options={lookups.items || []}
              onChange={(v) =>
                set({
                  itemFrom: v,
                  ...(value.itemTo ? {} : { itemTo: v }),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Item To</Label>
            <SearchableSelect
              value={value.itemTo || ""}
              placeholder="To item"
              options={lookups.items || []}
              onChange={(v) => set({ itemTo: v })}
            />
          </div>
        </>
      )}

      {filters.includes("vendorRange") && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Vendor From</Label>
            <SearchableSelect
              value={value.vendorFrom || ""}
              placeholder="From vendor"
              options={lookups.vendors || []}
              onChange={(v) =>
                set({
                  vendorFrom: v,
                  ...(value.vendorTo ? {} : { vendorTo: v }),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Vendor To</Label>
            <SearchableSelect
              value={value.vendorTo || ""}
              placeholder="To vendor"
              options={lookups.vendors || []}
              onChange={(v) => set({ vendorTo: v })}
            />
          </div>
        </>
      )}

      {filters.includes("topN") && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Top N</Label>
          <Input
            type="number"
            min="1"
            max="500"
            className="h-10"
            value={value.topN || 10}
            onChange={(e) =>
              set({ topN: parseInt(e.target.value || "10", 10) })
            }
          />
        </div>
      )}
    </div>
  );
}
