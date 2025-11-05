import type { IErrorDTO } from "@models/IErrorDTO";
import { Put } from "services/api";

export const updateById = async <IInputDTO, IDTO>(
    frontendDTO: IInputDTO, id: number, BASE_API_URL: string
): Promise<{data?: IDTO; error?: IErrorDTO}> =>{
    const API_URL = `${BASE_API_URL}/${id}`
    return await Put<IInputDTO,IDTO> (frontendDTO,API_URL)
}