  /* eslint-disable @typescript-eslint/no-explicit-any */
  import api from "@/lib/axios";

  export type StartRunPayload = {
    workflowId: string;
  };

  export const startRunApi = async ({ workflowId }: StartRunPayload) => {
    const res = await api.post("/runs/start", {
      workflowId,
    });
    console.log("startRunApi response:", res.data );
    return res.data;
  };
