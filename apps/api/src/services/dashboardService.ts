import { dashboardRepository } from "../repositories/dashboardRepository.js";

export const dashboardService = {
  async getKpis() {
    return dashboardRepository.getKpis();
  },
};
