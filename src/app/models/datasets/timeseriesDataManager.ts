// import { inject, resource } from "@angular/core";
// import { ApiHandler } from "../../services/requests/api-handler";


// export class TimeseriesDataManager {
//   apiHandler = inject(ApiHandler)

//   requestTrigger = signal<string | null>(null);

//   // 2. The Progressive Data Signal for the UI
//   partialData = signal<any[]>([]);

//   // 3. The Task Runner Resource
//   chunkRunner = resource({
//     params: () => this.requestTrigger(),
    
//     loader: async ({ params: query, abortSignal }) => {
//       if (!query) return false;

//       // RESET: Clear out the old data immediately when a new request starts
//       this.partialData.set([]);

//       const chunks = this.calculateChunks(query);

//       try {
//         for (const chunkPayload of chunks) {
          
//           // Safety check: exit the loop if Angular aborted this run
//           if (abortSignal.aborted) return false;

//           const response = await fetch('/api/data-chunk', {
//             method: 'POST',
//             body: JSON.stringify(chunkPayload),
//             headers: { 'Content-Type': 'application/json' },
//             signal: abortSignal // Native cancellation link
//           });

//           if (!response.ok) throw new Error('Chunk failed');
          
//           const newItems = await response.json();
          
//           // PROGRESSIVE UPDATE: Append the new chunk to the signal.
//           // Angular will immediately render these new items on the screen 
//           // without waiting for the rest of the chunks.
//           this.partialData.update(current => [...current, ...newItems]);
//         }
        
//         // Return true just so the resource knows the task completed successfully
//         return true; 
        
//       } catch (err: any) {
//         // If the error is an AbortError caused by switch requests, ignore it.
//         // Otherwise, throw it so the resource can track the failure.
//         if (err.name === 'AbortError') {
//           return false;
//         }
//         throw err;
//       }
// }