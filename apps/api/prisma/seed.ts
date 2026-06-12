import {
  AppRoleName,
  PrismaClient,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ROLES: { name: AppRoleName; description: string }[] = [
  {
    name: AppRoleName.admin,
    description: "Full platform access including user role management.",
  },
  {
    name: AppRoleName.innovation_lead,
    description: "Manage ideas, prototypes, and executive review workflows.",
  },
  {
    name: AppRoleName.developer,
    description: "Build and update owned ideas and prototypes.",
  },
  {
    name: AppRoleName.executive_reviewer,
    description: "Approve or reject ideas in executive review.",
  },
  {
    name: AppRoleName.viewer,
    description: "Read-only access to dashboard and catalog views.",
  },
];

const DEFAULT_REJECTION_REASONS = [
  {
    code: "insufficient_value",
    label: "Insufficient value hypothesis",
    description: "The proposed value does not meet the innovation bar.",
  },
  {
    code: "security_concerns",
    label: "Security or compliance concerns",
    description: "Security, privacy, or compliance risks were identified.",
  },
  {
    code: "duplicate_effort",
    label: "Duplicate existing effort",
    description: "Similar capability already exists or is in flight.",
  },
  {
    code: "resource_constraints",
    label: "Resource constraints",
    description: "Not enough capacity to pursue this idea now.",
  },
  {
    code: "needs_refinement",
    label: "Needs refinement",
    description: "Concept is promising but requires more detail before approval.",
  },
];

const LOCAL_ADMIN = {
  email: "admin@gradera.local",
  fullName: "Local Admin",
  entraObjectId: "local-dev-admin",
  role: AppRoleName.admin,
};

async function main() {
  console.log("Seeding GRADERA Innovation Hub database…");

  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log(`  ✓ ${DEFAULT_ROLES.length} roles`);

  for (const reason of DEFAULT_REJECTION_REASONS) {
    await prisma.rejectionReason.upsert({
      where: { code: reason.code },
      update: {
        label: reason.label,
        description: reason.description,
        active: true,
      },
      create: reason,
    });
  }
  console.log(`  ✓ ${DEFAULT_REJECTION_REASONS.length} rejection reasons`);

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: LOCAL_ADMIN.role },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: LOCAL_ADMIN.email },
    update: {
      fullName: LOCAL_ADMIN.fullName,
      entraObjectId: LOCAL_ADMIN.entraObjectId,
      status: UserStatus.active,
    },
    create: {
      email: LOCAL_ADMIN.email,
      fullName: LOCAL_ADMIN.fullName,
      entraObjectId: LOCAL_ADMIN.entraObjectId,
      status: UserStatus.active,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
  console.log(`  ✓ local admin user (${LOCAL_ADMIN.email})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
