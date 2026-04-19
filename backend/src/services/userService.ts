import { User } from "../models/User";
import { Coupon } from "../models/Coupon";
import { Notification } from "../models/Notification";
import { ApiError } from "../utils/apiError";

const calculateTier = (points: number) => {
  if (points < 500) return "Bronze";
  if (points < 1500) return "Silver";
  if (points < 3000) return "Gold";
  return "Diamond";
};

export const giveVoucher = async (id: string) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  const code = `GIFT-2USD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const coupon = await Coupon.create({
    code,
    discountType: "fixed",
    amount: 2,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  await Notification.create({
    user: id,
    type: "system",
    title: "Special Gift For You! 🎁",
    message: `You have received a $2 discount code! Use code ${code} at checkout.`,
  });

  return coupon;
};

export const addPoints = async (id: string, newPoints: number) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  user.points = (user.points || 0) + newPoints;
  user.membershipTier = calculateTier(user.points);
  
  await user.save();
  return user;
};

export const listUsers = () => User.find();
export const getUser = (id: string) => User.findById(id);
export const deleteUser = async (id: string) => {
  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) throw new ApiError(404, "User not found");
};

export const updateAdminUser = async (id: string, data: any) => {
  const allowedFields = ["role", "status", "points", "membershipTier", "internalNotes", "badmintonProfile"];
  const updateData: any = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }
  const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
  if (!user) throw new ApiError(404, "User not found");
  return user;
};

export const createUser = async (data: any) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new ApiError(400, "Email already in use");
  const user = await User.create(data);
  const userObj = user.toObject();
  delete (userObj as any).password;
  return userObj;
};

export const updateProfile = async (id: string, data: any) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  if (data.name) user.name = data.name;
  if (data.phone !== undefined) user.phone = data.phone;
  if (data.gender !== undefined) user.gender = data.gender;
  if (data.dob !== undefined) user.dob = data.dob;
  if (data.address !== undefined) user.address = data.address;
  if (data.addressList !== undefined) user.addressList = data.addressList;
  if (data.avatar !== undefined) user.avatar = data.avatar;
  
  if (data.newPassword) {
    if (!data.oldPassword) throw new ApiError(400, "Old password is required to change password");
    const isMatch = await user.comparePassword(data.oldPassword);
    if (!isMatch) throw new ApiError(400, "Incorrect old password");
    user.password = data.newPassword;
  }

  await user.save();
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    gender: user.gender,
    address: user.address,
    addressList: user.addressList,
    dob: user.dob,
    points: user.points,
    membershipTier: user.membershipTier,
    totalSpending: user.totalSpending,
  };
};
