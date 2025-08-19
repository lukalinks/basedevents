import { NextRequest, NextResponse } from "next/server";
import { createOrUpdateHost, getHostByAddress } from "../../../lib/hosts";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    
    if (!address) {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      );
    }
    
    const profile = await getHostByAddress(address);
    
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, name, bio, avatarUrl } = body;
    
    if (!address) {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      );
    }
    
    const profileData = {
      address,
      name: name?.trim() || undefined,
      bio: bio?.trim() || undefined,
      avatarUrl: avatarUrl?.trim() || undefined,
    };
    
    const updatedProfile = await createOrUpdateHost(profileData);
    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POST and PUT do the same thing for profiles (upsert)
  return PUT(request);
}
